import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
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

    // Create practice session with enhanced tracking
    const practiceSession = await prisma.practiceSession.create({
      data: {
        userId: session.user.id,
        wpm,
        accuracy,
        errors,
        duration,
        wordsTyped,
        songId,
        lessonId,
        musicEnabled,
        homeRowAccuracy: rowAccuracy.home || null,
        topRowAccuracy: rowAccuracy.top || null,
        bottomRowAccuracy: rowAccuracy.bottom || null,
        numberRowAccuracy: rowAccuracy.numbers || null,
        leftHandAccuracy: handAccuracy.left || null,
        rightHandAccuracy: handAccuracy.right || null,
        correctKeystrokes,
        incorrectKeystrokes,
      },
    })

    // Log errors for research analysis
    if (errorDetails && errorDetails.length > 0) {
      await prisma.errorLog.createMany({
        data:       errorDetails.map((err: { expected: string; typed: string; finger?: string; row?: string; hand?: string }) => ({
          userId: session.user.id,
          expectedKey: err.expected,
          typedKey: err.typed,
          finger: err.finger || null,
          row: err.row || null,
          hand: err.hand || null,
          sessionId: practiceSession.id,
        })),
      })
    }

    // Update finger statistics
    if (fingerStats && fingerStats.length > 0) {
      for (const stat of fingerStats) {
        const existing = await prisma.fingerStat.findUnique({
          where: {
            userId_finger: {
              userId: session.user.id,
              finger: stat.finger,
            },
          },
        })

        if (existing) {
          const newTotal = existing.totalKeystrokes + stat.total
          const newCorrect = existing.correctKeystrokes + stat.correct
          await prisma.fingerStat.update({
            where: { id: existing.id },
            data: {
              totalKeystrokes: newTotal,
              correctKeystrokes: newCorrect,
              accuracy: newTotal > 0 ? (newCorrect / newTotal) * 100 : 0,
            },
          })
        } else {
          await prisma.fingerStat.create({
            data: {
              userId: session.user.id,
              finger: stat.finger,
              totalKeystrokes: stat.total,
              correctKeystrokes: stat.correct,
              accuracy: stat.total > 0 ? (stat.correct / stat.total) * 100 : 0,
            },
          })
        }
      }
    }

    // Update practice calendar
    const today = new Date().toISOString().split("T")[0]
    const existingCalendar = await prisma.practiceCalendar.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
    })

    if (existingCalendar) {
      const newSessionsCount = existingCalendar.sessionsCount + 1
      const newTotalMinutes = existingCalendar.practiceMinutes + Math.round(duration / 60)
      const newTotalWords = existingCalendar.wordsTyped + wordsTyped
      const newAvgWpm = (existingCalendar.averageWpm * existingCalendar.sessionsCount + wpm) / newSessionsCount
      const newAvgAccuracy = (existingCalendar.averageAccuracy * existingCalendar.sessionsCount + accuracy) / newSessionsCount

      await prisma.practiceCalendar.update({
        where: { id: existingCalendar.id },
        data: {
          practiceMinutes: newTotalMinutes,
          sessionsCount: newSessionsCount,
          wordsTyped: newTotalWords,
          averageWpm: newAvgWpm,
          averageAccuracy: newAvgAccuracy,
        },
      })
    } else {
      await prisma.practiceCalendar.create({
        data: {
          userId: session.user.id,
          date: today,
          practiceMinutes: Math.round(duration / 60),
          sessionsCount: 1,
          wordsTyped: wordsTyped,
          averageWpm: wpm,
          averageAccuracy: accuracy,
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const lastPracticeDate = user.lastPracticeDate

    let newStreak = user.currentStreak
    if (lastPracticeDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      if (lastPracticeDate === yesterdayStr) {
        newStreak = user.currentStreak + 1
      } else if (lastPracticeDate !== today) {
        newStreak = 1
      }
    }

    const newXp = user.xp + Math.floor(wpm * (accuracy / 100))
    const newLevel = Math.floor(newXp / 500) + 1
    const newTotalPracticeTime = user.totalPracticeTime + duration
    const newTotalWordsTyped = user.totalWordsTyped + wordsTyped
    const newBestWpm = Math.max(user.bestWpm, wpm)
    const newBestAccuracy = Math.max(user.bestAccuracy, accuracy)
    const newLongestStreak = Math.max(user.longestStreak, newStreak)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        xp: newXp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastPracticeDate: today,
        totalPracticeTime: newTotalPracticeTime,
        totalWordsTyped: newTotalWordsTyped,
        bestWpm: newBestWpm,
        bestAccuracy: newBestAccuracy,
      },
    })

    const achievements = await prisma.achievement.findMany()
    const earnedAchievements = []

    for (const achievement of achievements) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId: session.user.id,
            achievementId: achievement.id,
          },
        },
      })

      if (existing) continue

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
        await prisma.userAchievement.create({
          data: {
            userId: session.user.id,
            achievementId: achievement.id,
          },
        })
        await prisma.user.update({
          where: { id: session.user.id },
          data: { xp: { increment: achievement.xpReward } },
        })
        earnedAchievements.push(achievement)
      }
    }

    if (songId) {
      const userSong = await prisma.userSong.findUnique({
        where: {
          userId_songId: {
            userId: session.user.id,
            songId,
          },
        },
      })

      if (userSong) {
        await prisma.userSong.update({
          where: { id: userSong.id },
          data: {
            bestWpm: Math.max(userSong.bestWpm, wpm),
            bestAccuracy: Math.max(userSong.bestAccuracy, accuracy),
            attempts: { increment: 1 },
            completed: accuracy >= 80,
          },
        })
      } else {
        await prisma.userSong.create({
          data: {
            userId: session.user.id,
            songId,
            bestWpm: wpm,
            bestAccuracy: accuracy,
            attempts: 1,
            completed: accuracy >= 80,
          },
        })
      }
    }

    if (lessonId) {
      const userLesson = await prisma.userLesson.findUnique({
        where: {
          userId_lessonId: {
            userId: session.user.id,
            lessonId,
          },
        },
      })

      if (userLesson) {
        await prisma.userLesson.update({
          where: { id: userLesson.id },
          data: {
            bestWpm: Math.max(userLesson.bestWpm, wpm),
            bestAccuracy: Math.max(userLesson.bestAccuracy, accuracy),
            attempts: { increment: 1 },
            completed: accuracy >= 80,
          },
        })
      } else {
        await prisma.userLesson.create({
          data: {
            userId: session.user.id,
            lessonId,
            bestWpm: wpm,
            bestAccuracy: accuracy,
            attempts: 1,
            completed: accuracy >= 80,
          },
        })
      }

      const allLessons = await prisma.lesson.count()
      const completedLessons = await prisma.userLesson.count({
        where: {
          userId: session.user.id,
          completed: true,
        },
      })

      if (completedLessons >= allLessons) {
        const keyboardMaster = await prisma.achievement.findFirst({
          where: { condition: "all_lessons" },
        })
        if (keyboardMaster) {
          const existing = await prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId: session.user.id,
                achievementId: keyboardMaster.id,
              },
            },
          })
          if (!existing) {
            await prisma.userAchievement.create({
              data: {
                userId: session.user.id,
                achievementId: keyboardMaster.id,
              },
            })
            await prisma.user.update({
              where: { id: session.user.id },
              data: { xp: { increment: keyboardMaster.xpReward } },
            })
            earnedAchievements.push(keyboardMaster)
          }
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
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessions = await prisma.practiceSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        song: true,
        lesson: true,
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Fetch sessions error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
