import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"
import { calculateSessionMetrics, PerformanceSample } from "@/lib/typing-session"
import { calculateTypingStats } from "@/lib/typing-engine"

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      sessionKey,
      typedText = "",
      samples = [],
      duration = 30,
      songId,
      lessonId,
      codeActivityId,
      musicEnabled = true,
    } = await request.json()

    const supabase = await getSupabase()

    const targetCount = [songId, lessonId, codeActivityId].filter(Boolean).length
    if (!sessionKey || targetCount !== 1) {
      return NextResponse.json({ error: "A unique session key and one practice target are required" }, { status: 400 })
    }

    const { data: target } = codeActivityId
      ? await supabase.from("code_activities").select("code").eq("id", codeActivityId).single()
      : songId
        ? await supabase.from("songs").select("lyrics").eq("id", songId).single()
        : await supabase.from("lessons").select("content").eq("id", lessonId).single()
    const targetRecord = target as { lyrics?: string; content?: string; code?: string } | null
    const expectedText = targetRecord?.lyrics || targetRecord?.content || targetRecord?.code
    if (!expectedText || typeof typedText !== "string") return NextResponse.json({ error: "Practice target not found" }, { status: 400 })

    const performanceSamples = Array.isArray(samples) ? samples as PerformanceSample[] : []
    const metrics = calculateSessionMetrics(expectedText, typedText, Math.min(30, Math.max(0, Number(duration))), performanceSamples)
    const typingStats = calculateTypingStats(expectedText, typedText)
    const { data: existingSession } = await supabase.from("practice_sessions").select("id").eq("user_id", user.id).eq("session_key", sessionKey).maybeSingle()
    if (existingSession) return NextResponse.json({ practiceSession: existingSession, duplicate: true })

    const { data: preTest } = await supabase
      .from('assessment_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('kind', 'pre')
      .maybeSingle()

    if (!preTest) {
      return NextResponse.json({ error: 'Complete the pre-test before practicing' }, { status: 403 })
    }

    // Create practice session
    const { data: practiceSession } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        session_key: sessionKey,
        wpm: Math.round(metrics.netWpm),
        raw_wpm: Math.round(metrics.rawWpm),
        net_wpm: Math.round(metrics.netWpm),
        accuracy: metrics.accuracy,
        errors: metrics.errors,
        duration: metrics.duration,
        words_typed: metrics.wordsTyped,
        song_id: songId,
        lesson_id: lessonId,
        code_activity_id: codeActivityId,
        music_enabled: musicEnabled,
        home_row_accuracy: typingStats.rowAccuracy.home || null,
        top_row_accuracy: typingStats.rowAccuracy.top || null,
        bottom_row_accuracy: typingStats.rowAccuracy.bottom || null,
        number_row_accuracy: typingStats.rowAccuracy.numbers || null,
        left_hand_accuracy: typingStats.handAccuracy.left || null,
        right_hand_accuracy: typingStats.handAccuracy.right || null,
        correct_keystrokes: metrics.correctCharacters,
        incorrect_keystrokes: metrics.incorrectCharacters,
        extra_characters: metrics.extraCharacters,
        missed_characters: metrics.missedCharacters,
        consistency: metrics.consistency,
        performance_samples: performanceSamples,
      })
      .select()
      .single()

    if (!practiceSession) return NextResponse.json({ error: "Unable to save practice session" }, { status: 503 })

    // Log errors
    if (typingStats.errors.length > 0) {
      await supabase.from('error_logs').insert(
        typingStats.errors.map((err) => ({
          user_id: user.id,
          expected_key: err.expected,
          typed_key: err.typed,
          finger: err.finger || null,
          row: err.row || null,
          hand: err.hand || null,
          session_id: practiceSession.id,
        }))
      )
    }

    // Update finger statistics
    for (const stat of typingStats.fingerStats) {
      const { data: existing } = await supabase
        .from('finger_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('finger', stat.finger)
        .single()

      if (existing) {
        const newTotal = existing.total_keystrokes + stat.total
        const newCorrect = existing.correct_keystrokes + stat.correct
        await supabase
          .from('finger_stats')
          .update({
            total_keystrokes: newTotal,
            correct_keystrokes: newCorrect,
            accuracy: newTotal > 0 ? (newCorrect / newTotal) * 100 : 0,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('finger_stats').insert({
          user_id: user.id,
          finger: stat.finger,
          total_keystrokes: stat.total,
          correct_keystrokes: stat.correct,
          accuracy: stat.total > 0 ? (stat.correct / stat.total) * 100 : 0,
        })
      }
    }

    // Update practice calendar
    const today = new Date().toISOString().split("T")[0]
    const { data: existingCalendar } = await supabase
      .from('practice_calendar')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (existingCalendar) {
      const newSessionsCount = existingCalendar.sessions_count + 1
      const newTotalMinutes = existingCalendar.practice_minutes + Math.round(metrics.duration / 60)
      const newTotalWords = existingCalendar.words_typed + metrics.wordsTyped
      const newAvgWpm = (existingCalendar.average_wpm * existingCalendar.sessions_count + metrics.netWpm) / newSessionsCount
      const newAvgAccuracy = (existingCalendar.average_accuracy * existingCalendar.sessions_count + metrics.accuracy) / newSessionsCount

      await supabase
        .from('practice_calendar')
        .update({
          practice_minutes: newTotalMinutes,
          sessions_count: newSessionsCount,
          words_typed: newTotalWords,
          average_wpm: newAvgWpm,
          average_accuracy: newAvgAccuracy,
        })
        .eq('id', existingCalendar.id)
    } else {
      await supabase.from('practice_calendar').insert({
        user_id: user.id,
        date: today,
        practice_minutes: Math.round(metrics.duration / 60),
        sessions_count: 1,
        words_typed: metrics.wordsTyped,
        average_wpm: metrics.netWpm,
        average_accuracy: metrics.accuracy,
      })
    }

    // Update user stats
    const lastPracticeDate = user.last_practice_date
    let newStreak = user.current_streak

    if (lastPracticeDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      if (lastPracticeDate === yesterdayStr) {
        newStreak = user.current_streak + 1
      } else {
        newStreak = 1
      }
    }

    // Songs are longer milestone activities, so reward them generously.
    const sessionXp = songId
      ? Math.max(500, Math.floor(metrics.netWpm * (metrics.accuracy / 100) * 5))
      : Math.floor(metrics.netWpm * (metrics.accuracy / 100))
    const newXp = user.xp + sessionXp
    const newLevel = Math.floor(newXp / 500) + 1
    const newTotalPracticeTime = user.total_practice_time + metrics.duration
    const newTotalWordsTyped = user.total_words_typed + metrics.wordsTyped
    const newBestWpm = Math.max(user.best_wpm, Math.round(metrics.netWpm))
    const newBestAccuracy = Math.max(user.best_accuracy, metrics.accuracy)
    const newLongestStreak = Math.max(user.longest_streak, newStreak)

    await supabase
      .from('users')
      .update({
        xp: newXp,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_practice_date: today,
        total_practice_time: newTotalPracticeTime,
        total_words_typed: newTotalWordsTyped,
        best_wpm: newBestWpm,
        best_accuracy: newBestAccuracy,
      })
      .eq('id', user.id)

    // Check achievements
    const { data: achievements } = await supabase.from('achievements').select('*')
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)

    const earnedAchievements = []
    const existingAchievementIds = new Set((userAchievements || []).map((ua) => ua.achievement_id))

    for (const achievement of achievements || []) {
      if (existingAchievementIds.has(achievement.id)) continue

      let earned = false
      switch (achievement.condition) {
        case "first_practice":
          earned = true
          break
        case "accuracy_95":
           earned = metrics.accuracy >= 95
          break
        case "accuracy_100":
           earned = metrics.accuracy >= 100
          break
        case "wpm_80":
           earned = metrics.netWpm >= 80
          break
        case "wpm_100":
           earned = metrics.netWpm >= 100
          break
        case "streak_7":
          earned = newStreak >= 7
          break
        case "words_10000":
           earned = newTotalWordsTyped >= 10000
          break
        case "time_10hours":
          earned = newTotalPracticeTime >= 36000
          break
        case "first_song":
          earned = !!songId
          break
      }

      if (earned) {
        await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: achievement.id,
        })
        const updatedXp = newXp + achievement.xp_reward
        await supabase.from('users').update({ xp: updatedXp }).eq('id', user.id)
        earnedAchievements.push(achievement)
      }
    }

    // Update song progress
    if (songId) {
      const { data: userSong } = await supabase
        .from('user_songs')
        .select('*')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single()

      if (userSong) {
        await supabase
          .from('user_songs')
          .update({
             best_wpm: Math.max(userSong.best_wpm, Math.round(metrics.netWpm)),
             best_accuracy: Math.max(userSong.best_accuracy, metrics.accuracy),
            attempts: userSong.attempts + 1,
             completed: metrics.accuracy >= 80,
          })
          .eq('id', userSong.id)
      } else {
        await supabase.from('user_songs').insert({
          user_id: user.id,
          song_id: songId,
           best_wpm: Math.round(metrics.netWpm),
           best_accuracy: metrics.accuracy,
          attempts: 1,
           completed: metrics.accuracy >= 80,
        })
      }
    }

    // Update lesson progress
    if (lessonId) {
      const { data: userLesson } = await supabase
        .from('user_lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single()

      if (userLesson) {
        await supabase
          .from('user_lessons')
          .update({
             best_wpm: Math.max(userLesson.best_wpm, Math.round(metrics.netWpm)),
             best_accuracy: Math.max(userLesson.best_accuracy, metrics.accuracy),
            attempts: userLesson.attempts + 1,
             completed: metrics.accuracy >= 80,
          })
          .eq('id', userLesson.id)
      } else {
        await supabase.from('user_lessons').insert({
          user_id: user.id,
          lesson_id: lessonId,
           best_wpm: Math.round(metrics.netWpm),
           best_accuracy: metrics.accuracy,
          attempts: 1,
           completed: metrics.accuracy >= 80,
        })
      }

      // Check if all lessons completed
      const { count: allLessonsCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true })
      const { count: completedLessonsCount } = await supabase
        .from('user_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)

      if (completedLessonsCount !== null && allLessonsCount !== null && completedLessonsCount >= allLessonsCount) {
        const { data: keyboardMaster } = await supabase
          .from('achievements')
          .select('*')
          .eq('condition', 'all_lessons')
          .single()

        if (keyboardMaster && !existingAchievementIds.has(keyboardMaster.id)) {
          await supabase.from('user_achievements').insert({
            user_id: user.id,
            achievement_id: keyboardMaster.id,
          })
          const finalXp = (await supabase.from('users').select('xp').eq('id', user.id).single()).data?.xp || 0
          await supabase.from('users').update({ xp: finalXp + keyboardMaster.xp_reward }).eq('id', user.id)
          earnedAchievements.push(keyboardMaster)
        }
      }
    }

    return NextResponse.json({
      practiceSession,
      earnedAchievements,
      user: {
        xp: newXp,
        level: newLevel,
        currentStreak: newStreak,
        bestWpm: newBestWpm,
        bestAccuracy: newBestAccuracy,
      },
    })
  } catch (error) {
    console.error("Practice session error:", error)
    return NextResponse.json({ error: "Failed to save practice session" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()

    const { data: sessions } = await supabase
      .from('practice_sessions')
      .select('*, song:songs(*), lesson:lessons(*), code_activity:code_activities(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json(sessions || [])
  } catch (error) {
    console.error("Fetch sessions error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
