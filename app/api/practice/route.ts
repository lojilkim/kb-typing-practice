import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      wpm,
      accuracy,
      errors,
      duration,
      wordsTyped,
      songId,
      lessonId,
      musicEnabled = true,
      errorDetails = [],
      fingerStats = [],
      rowAccuracy = {},
      handAccuracy = {},
      correctKeystrokes = 0,
      incorrectKeystrokes = 0,
    } = await request.json()

    const supabase = await getSupabase()

    // Create practice session
    const { data: practiceSession } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        wpm,
        accuracy,
        errors,
        duration,
        words_typed: wordsTyped,
        song_id: songId,
        lesson_id: lessonId,
        music_enabled: musicEnabled,
        home_row_accuracy: rowAccuracy.home || null,
        top_row_accuracy: rowAccuracy.top || null,
        bottom_row_accuracy: rowAccuracy.bottom || null,
        number_row_accuracy: rowAccuracy.numbers || null,
        left_hand_accuracy: handAccuracy.left || null,
        right_hand_accuracy: handAccuracy.right || null,
        correct_keystrokes: correctKeystrokes,
        incorrect_keystrokes: incorrectKeystrokes,
      })
      .select()
      .single()

    // Log errors
    if (errorDetails.length > 0) {
      await supabase.from('error_logs').insert(
        errorDetails.map((err: { expected: string; typed: string; finger?: string; row?: string; hand?: string }) => ({
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
    for (const stat of fingerStats) {
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
      const newTotalMinutes = existingCalendar.practice_minutes + Math.round(duration / 60)
      const newTotalWords = existingCalendar.words_typed + wordsTyped
      const newAvgWpm = (existingCalendar.average_wpm * existingCalendar.sessions_count + wpm) / newSessionsCount
      const newAvgAccuracy = (existingCalendar.average_accuracy * existingCalendar.sessions_count + accuracy) / newSessionsCount

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
        practice_minutes: Math.round(duration / 60),
        sessions_count: 1,
        words_typed: wordsTyped,
        average_wpm: wpm,
        average_accuracy: accuracy,
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

    const newXp = user.xp + Math.floor(wpm * (accuracy / 100))
    const newLevel = Math.floor(newXp / 500) + 1
    const newTotalPracticeTime = user.total_practice_time + duration
    const newTotalWordsTyped = user.total_words_typed + wordsTyped
    const newBestWpm = Math.max(user.best_wpm, wpm)
    const newBestAccuracy = Math.max(user.best_accuracy, accuracy)
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
          earned = accuracy >= 95
          break
        case "accuracy_100":
          earned = accuracy >= 100
          break
        case "wpm_80":
          earned = wpm >= 80
          break
        case "wpm_100":
          earned = wpm >= 100
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
            best_wpm: Math.max(userSong.best_wpm, wpm),
            best_accuracy: Math.max(userSong.best_accuracy, accuracy),
            attempts: userSong.attempts + 1,
            completed: accuracy >= 80,
          })
          .eq('id', userSong.id)
      } else {
        await supabase.from('user_songs').insert({
          user_id: user.id,
          song_id: songId,
          best_wpm: wpm,
          best_accuracy: accuracy,
          attempts: 1,
          completed: accuracy >= 80,
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
            best_wpm: Math.max(userLesson.best_wpm, wpm),
            best_accuracy: Math.max(userLesson.best_accuracy, accuracy),
            attempts: userLesson.attempts + 1,
            completed: accuracy >= 80,
          })
          .eq('id', userLesson.id)
      } else {
        await supabase.from('user_lessons').insert({
          user_id: user.id,
          lesson_id: lessonId,
          best_wpm: wpm,
          best_accuracy: accuracy,
          attempts: 1,
          completed: accuracy >= 80,
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
      .select('*, song:songs(*), lesson:lessons(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json(sessions || [])
  } catch (error) {
    console.error("Fetch sessions error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
