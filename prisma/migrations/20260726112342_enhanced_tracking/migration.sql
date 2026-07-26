-- AlterTable
ALTER TABLE "Song" ADD COLUMN "audioUrl" TEXT;

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expectedKey" TEXT NOT NULL,
    "typedKey" TEXT NOT NULL,
    "finger" TEXT,
    "row" TEXT,
    "hand" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FingerStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "finger" TEXT NOT NULL,
    "totalKeystrokes" INTEGER NOT NULL DEFAULT 0,
    "correctKeystrokes" INTEGER NOT NULL DEFAULT 0,
    "accuracy" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FingerStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "practiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "wordsTyped" INTEGER NOT NULL DEFAULT 0,
    "averageWpm" REAL NOT NULL DEFAULT 0,
    "averageAccuracy" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PracticeCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wpm" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "errors" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "wordsTyped" INTEGER NOT NULL,
    "songId" TEXT,
    "lessonId" TEXT,
    "musicEnabled" BOOLEAN NOT NULL DEFAULT true,
    "postureRemindersAcknowledged" INTEGER NOT NULL DEFAULT 0,
    "homeRowAccuracy" REAL,
    "topRowAccuracy" REAL,
    "bottomRowAccuracy" REAL,
    "numberRowAccuracy" REAL,
    "leftHandAccuracy" REAL,
    "rightHandAccuracy" REAL,
    "correctKeystrokes" INTEGER NOT NULL DEFAULT 0,
    "incorrectKeystrokes" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PracticeSession" ("accuracy", "createdAt", "duration", "errors", "id", "lessonId", "songId", "userId", "wordsTyped", "wpm") SELECT "accuracy", "createdAt", "duration", "errors", "id", "lessonId", "songId", "userId", "wordsTyped", "wpm" FROM "PracticeSession";
DROP TABLE "PracticeSession";
ALTER TABLE "new_PracticeSession" RENAME TO "PracticeSession";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "profilePicture" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPracticeDate" TEXT,
    "totalPracticeTime" INTEGER NOT NULL DEFAULT 0,
    "totalWordsTyped" INTEGER NOT NULL DEFAULT 0,
    "bestWpm" INTEGER NOT NULL DEFAULT 0,
    "bestAccuracy" REAL NOT NULL DEFAULT 0,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "volume" INTEGER NOT NULL DEFAULT 70,
    "musicEnabled" BOOLEAN NOT NULL DEFAULT true,
    "postureReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bestAccuracy", "bestWpm", "createdAt", "currentStreak", "fontSize", "id", "lastPracticeDate", "level", "longestStreak", "password", "profilePicture", "studentId", "theme", "totalPracticeTime", "totalWordsTyped", "updatedAt", "username", "volume", "xp") SELECT "bestAccuracy", "bestWpm", "createdAt", "currentStreak", "fontSize", "id", "lastPracticeDate", "level", "longestStreak", "password", "profilePicture", "studentId", "theme", "totalPracticeTime", "totalWordsTyped", "updatedAt", "username", "volume", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FingerStat_userId_finger_key" ON "FingerStat"("userId", "finger");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCalendar_userId_date_key" ON "PracticeCalendar"("userId", "date");
