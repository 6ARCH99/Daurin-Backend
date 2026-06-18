/*
  SQL schema generated from Prisma schema.
  Place this file in the backend/sql directory and use it to set up the MySQL database.
*/

-- Users
CREATE TABLE `User` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255),
  `fullName` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `profilePhotoUrl` VARCHAR(255),
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `rank` VARCHAR(50) NOT NULL DEFAULT 'Bronze',
  `memberSince` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `totalPoints` INT NOT NULL DEFAULT 0,
  `co2SavedKg` DOUBLE NOT NULL DEFAULT 0,
  `totalWeightKg` DOUBLE NOT NULL DEFAULT 0,
  `activeDays` INT NOT NULL DEFAULT 0,
  `referralCode` VARCHAR(255) NOT NULL UNIQUE,
  `referredById` VARCHAR(255),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_referredBy` FOREIGN KEY (`referredById`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refresh Tokens
CREATE TABLE `RefreshToken` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL UNIQUE,
  `expiresAt` DATETIME NOT NULL,
  `revokedAt` DATETIME,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_refreshToken_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OTP Codes
CREATE TABLE `OtpCode` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(50) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL DEFAULT 'register',
  `expiresAt` DATETIME NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password Reset Tokens
CREATE TABLE `PasswordResetToken` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL UNIQUE,
  `expiresAt` DATETIME NOT NULL,
  `usedAt` DATETIME,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_passwordReset_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OAuth Accounts
CREATE TABLE `OAuthAccount` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(100) NOT NULL,
  `providerId` VARCHAR(255) NOT NULL,
  CONSTRAINT `fk_oauth_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_oauth_provider_providerId` (`provider`,`providerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Preferences
CREATE TABLE `UserPreferences` (
  `userId` VARCHAR(255) NOT NULL PRIMARY KEY,
  `pushPoints` BOOLEAN NOT NULL DEFAULT TRUE,
  `pushPickup` BOOLEAN NOT NULL DEFAULT TRUE,
  `pushChallenge` BOOLEAN NOT NULL DEFAULT TRUE,
  `pushReward` BOOLEAN NOT NULL DEFAULT TRUE,
  `emailNewsletter` BOOLEAN NOT NULL DEFAULT TRUE,
  `emailPromo` BOOLEAN NOT NULL DEFAULT FALSE,
  `language` VARCHAR(10) NOT NULL DEFAULT 'id',
  `defaultDepositMethod` VARCHAR(20) NOT NULL DEFAULT 'pickup',
  `showOnLeaderboard` BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT `fk_preferences_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- EWallet
CREATE TABLE `EWallet` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL UNIQUE,
  `platform` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ewallet_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drop Points
CREATE TABLE `DropPoint` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `phone` VARCHAR(50),
  `openTime` VARCHAR(10) NOT NULL,
  `closeTime` VARCHAR(10) NOT NULL,
  `rating` FLOAT NOT NULL DEFAULT 4.5,
  `reviewCount` INT NOT NULL DEFAULT 0,
  `isOpen` BOOLEAN NOT NULL DEFAULT TRUE,
  `materials` TEXT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deposits
CREATE TABLE `Deposit` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `weightKg` DOUBLE NOT NULL,
  `co2SavedKg` DOUBLE NOT NULL,
  `points` INT NOT NULL,
  `location` VARCHAR(255),
  `type` VARCHAR(50) NOT NULL DEFAULT 'drop_point',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_deposit_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deposit Transactions
CREATE TABLE `DepositTransaction` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `dropPointId` VARCHAR(255),
  `pickupId` VARCHAR(255) UNIQUE,
  `type` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `verificationToken` VARCHAR(255) NOT NULL UNIQUE,
  `totalWeightKg` DOUBLE NOT NULL DEFAULT 0,
  `co2SavedKg` DOUBLE NOT NULL DEFAULT 0,
  `pointsAwarded` INT NOT NULL DEFAULT 0,
  `categoriesJson` TEXT NOT NULL,
  `verifiedAt` DATETIME,
  `verifiedBy` VARCHAR(255),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_depositTxn_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_depositTxn_dropPoint` FOREIGN KEY (`dropPointId`) REFERENCES `DropPoint`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_depositTxn_pickup` FOREIGN KEY (`pickupId`) REFERENCES `PickupSchedule`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pickup Schedules
CREATE TABLE `PickupSchedule` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `scheduledAt` DATETIME NOT NULL,
  `estimatedWeightKg` DOUBLE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  `courierNote` TEXT,
  `actualWeightKg` DOUBLE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pickup_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activities
CREATE TABLE `Activity` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `pointsDelta` INT NOT NULL DEFAULT 0,
  `metadata` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Challenges
CREATE TABLE `Challenge` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `targetValue` DOUBLE NOT NULL,
  `targetUnit` VARCHAR(20) NOT NULL DEFAULT 'kg',
  `rewardPoints` INT NOT NULL,
  `difficulty` VARCHAR(20) NOT NULL DEFAULT 'medium',
  `durationDays` INT NOT NULL,
  `endsAt` DATETIME NOT NULL,
  `isFeatured` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Challenges
CREATE TABLE `UserChallenge` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `challengeId` VARCHAR(255) NOT NULL,
  `progress` DOUBLE NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `joinedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_userChallenge_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_userChallenge_challenge` FOREIGN KEY (`challengeId`) REFERENCES `Challenge`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_challenge` (`userId`,`challengeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Badges
CREATE TABLE `Badge` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `icon` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Badges
CREATE TABLE `UserBadge` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `badgeId` VARCHAR(255) NOT NULL,
  `earnedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_userBadge_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_userBadge_badge` FOREIGN KEY (`badgeId`) REFERENCES `Badge`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_badge` (`userId`,`badgeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Point Redemptions
CREATE TABLE `PointRedemption` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `platform` VARCHAR(100) NOT NULL,
  `amountRp` INT NOT NULL,
  `points` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `externalRef` VARCHAR(255),
  `failReason` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` DATETIME,
  CONSTRAINT `fk_pointRedemption_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Point Ledger
CREATE TABLE `PointLedger` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `amount` INT NOT NULL,
  `balanceAfter` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `referenceId` VARCHAR(255),
  `description` TEXT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pointLedger_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Referral Events
CREATE TABLE `ReferralEvent` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `referrerId` VARCHAR(255) NOT NULL,
  `refereeId` VARCHAR(255) NOT NULL UNIQUE,
  `bonusPoints` INT NOT NULL DEFAULT 100,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_referral_referrer` FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_referee` FOREIGN KEY (`refereeId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FAQs
CREATE TABLE `Faq` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `question` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `keywords` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Support Tickets
CREATE TABLE `SupportTicket` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Logs
CREATE TABLE `AuditLog` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255),
  `action` VARCHAR(255) NOT NULL,
  `resource` VARCHAR(255) NOT NULL,
  `metadata` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notification Queue
CREATE TABLE `NotificationQueue` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(255) NOT NULL,
  `channel` VARCHAR(50) NOT NULL,
  `event` VARCHAR(100) NOT NULL,
  `payload` TEXT NOT NULL,
  `sent` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
