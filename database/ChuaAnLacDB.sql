-- =====================================================================
-- DATABASE CREATION: CHUA AN LAC ONLINE
-- RDBMS: Microsoft SQL Server 2019+
-- =====================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ChuaAnLacDB')
BEGIN
    CREATE DATABASE ChuaAnLacDB;
END
GO

USE ChuaAnLacDB;
GO

-- 1. BẢNG USERS (Tài khoản người dùng)
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Users_UserId DEFAULT NEWSEQUENTIALID(),
        Username NVARCHAR(50) NOT NULL,
        Email NVARCHAR(100) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        PasswordSalt NVARCHAR(255) NOT NULL,
        Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'Player', -- Player, Admin, Monk
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        LastLoginAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (UserId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email)
    );
END
GO

-- 2. BẢNG CHARACTERS (Nhân vật trong game)
IF OBJECT_ID(N'dbo.Characters', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Characters (
        CharacterId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Characters_CharacterId DEFAULT NEWSEQUENTIALID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        DharmaName NVARCHAR(50) NOT NULL, -- Pháp danh / Tên nhân vật hiển thị
        Gender NVARCHAR(10) NOT NULL CONSTRAINT DF_Characters_Gender DEFAULT 'Neutral',
        AvatarId NVARCHAR(50) NOT NULL CONSTRAINT DF_Characters_AvatarId DEFAULT 'chibi_default',
        OutfitId NVARCHAR(50) NOT NULL CONSTRAINT DF_Characters_OutfitId DEFAULT 'robe_gray',
        CurrentMap NVARCHAR(50) NOT NULL CONSTRAINT DF_Characters_CurrentMap DEFAULT 'temple_main',
        PosX FLOAT NOT NULL CONSTRAINT DF_Characters_PosX DEFAULT 10.0,
        PosY FLOAT NOT NULL CONSTRAINT DF_Characters_PosY DEFAULT 15.0,
        PurityDrops INT NOT NULL CONSTRAINT DF_Characters_PurityDrops DEFAULT 50, -- Giọt Cam Lồ (tiền tệ thư giãn)
        TotalMeditateMinutes INT NOT NULL CONSTRAINT DF_Characters_TotalMeditateMinutes DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Characters_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Characters_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Characters PRIMARY KEY CLUSTERED (CharacterId),
        CONSTRAINT FK_Characters_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT UQ_Characters_DharmaName UNIQUE (DharmaName)
    );
    CREATE NONCLUSTERED INDEX IX_Characters_UserId ON dbo.Characters(UserId);
END
GO

-- 3. BẢNG ITEMS (Danh mục vật phẩm & hạt giống)
IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Items (
        ItemId NVARCHAR(50) NOT NULL,
        ItemName NVARCHAR(100) NOT NULL,
        Category NVARCHAR(30) NOT NULL, -- Seed, Flower, Lantern, Decoration, Robe
        Description NVARCHAR(500) NULL,
        PriceDrops INT NOT NULL CONSTRAINT DF_Items_PriceDrops DEFAULT 0,
        GrowthDurationSec INT NOT NULL CONSTRAINT DF_Items_GrowthDuration DEFAULT 0, -- Thời gian nở (cho hạt giống)
        IsTradable BIT NOT NULL CONSTRAINT DF_Items_IsTradable DEFAULT 0,
        IconUrl NVARCHAR(255) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Items_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Items PRIMARY KEY CLUSTERED (ItemId)
    );
END
GO

-- 4. BẢNG CHARACTER_INVENTORY (Túi đồ của nhân vật)
IF OBJECT_ID(N'dbo.CharacterInventory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CharacterInventory (
        InventoryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Inventory_Id DEFAULT NEWSEQUENTIALID(),
        CharacterId UNIQUEIDENTIFIER NOT NULL,
        ItemId NVARCHAR(50) NOT NULL,
        Quantity INT NOT NULL CONSTRAINT DF_Inventory_Quantity DEFAULT 1,
        IsEquipped BIT NOT NULL CONSTRAINT DF_Inventory_IsEquipped DEFAULT 0,
        AcquiredAt DATETIME2 NOT NULL CONSTRAINT DF_Inventory_AcquiredAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CharacterInventory PRIMARY KEY CLUSTERED (InventoryId),
        CONSTRAINT FK_CharacterInventory_Characters FOREIGN KEY (CharacterId) REFERENCES dbo.Characters(CharacterId) ON DELETE CASCADE,
        CONSTRAINT FK_CharacterInventory_Items FOREIGN KEY (ItemId) REFERENCES dbo.Items(ItemId),
        CONSTRAINT UQ_Character_Item UNIQUE (CharacterId, ItemId)
    );
    CREATE NONCLUSTERED INDEX IX_CharacterInventory_CharId ON dbo.CharacterInventory(CharacterId);
END
GO

-- 5. BẢNG GARDEN_PLOTS (Ô đất vườn riêng của người chơi)
IF OBJECT_ID(N'dbo.GardenPlots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GardenPlots (
        PlotId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Plots_PlotId DEFAULT NEWSEQUENTIALID(),
        CharacterId UNIQUEIDENTIFIER NOT NULL,
        PlotIndex INT NOT NULL, -- Vị trí ô (0 đến 8)
        PlantedItemId NVARCHAR(50) NULL, -- Hạt giống đang trồng
        PlantedAt DATETIME2 NULL,
        LastWateredAt DATETIME2 NULL,
        Stage INT NOT NULL CONSTRAINT DF_GardenPlots_Stage DEFAULT 0, -- 0: Đất trống, 1: Nảy mầm, 2: Búp non, 3: Nở hoa
        IsHarvested BIT NOT NULL CONSTRAINT DF_GardenPlots_IsHarvested DEFAULT 0,
        CONSTRAINT PK_GardenPlots PRIMARY KEY CLUSTERED (PlotId),
        CONSTRAINT FK_GardenPlots_Characters FOREIGN KEY (CharacterId) REFERENCES dbo.Characters(CharacterId) ON DELETE CASCADE,
        CONSTRAINT FK_GardenPlots_Items FOREIGN KEY (PlantedItemId) REFERENCES dbo.Items(ItemId),
        CONSTRAINT UQ_Character_PlotIndex UNIQUE (CharacterId, PlotIndex)
    );
    CREATE NONCLUSTERED INDEX IX_GardenPlots_CharId ON dbo.GardenPlots(CharacterId);
END
GO

-- 6. BẢNG LANTERN_WISHES (Hoa đăng nguyện ước thả hồ)
IF OBJECT_ID(N'dbo.LanternWishes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LanternWishes (
        LanternId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Lanterns_Id DEFAULT NEWSEQUENTIALID(),
        CharacterId UNIQUEIDENTIFIER NOT NULL,
        WishText NVARCHAR(250) NOT NULL,
        LanternType NVARCHAR(30) NOT NULL CONSTRAINT DF_Lanterns_Type DEFAULT 'lotus_pink',
        PosX FLOAT NOT NULL,
        PosY FLOAT NOT NULL,
        RejoiceCount INT NOT NULL CONSTRAINT DF_Lanterns_Rejoice DEFAULT 0, -- Lượt tán thán, tùy hỷ
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Lanterns_CreatedAt DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2 NOT NULL, -- Tự tiêu biến sau 24h để làm sạch mặt hồ
        CONSTRAINT PK_LanternWishes PRIMARY KEY CLUSTERED (LanternId),
        CONSTRAINT FK_LanternWishes_Characters FOREIGN KEY (CharacterId) REFERENCES dbo.Characters(CharacterId)
    );
    CREATE NONCLUSTERED INDEX IX_LanternWishes_ExpiresAt ON dbo.LanternWishes(ExpiresAt);
END
GO

-- 7. BẢNG FRIENDSHIPS (Quan hệ đồng tu / bạn hữu tâm giao)
IF OBJECT_ID(N'dbo.Friendships', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Friendships (
        FriendshipId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Friendships_Id DEFAULT NEWSEQUENTIALID(),
        CharacterId1 UNIQUEIDENTIFIER NOT NULL,
        CharacterId2 UNIQUEIDENTIFIER NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Friendships_Status DEFAULT 'Pending', -- Pending, Accepted, Blocked
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Friendships_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Friendships_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Friendships PRIMARY KEY CLUSTERED (FriendshipId),
        CONSTRAINT FK_Friendships_Char1 FOREIGN KEY (CharacterId1) REFERENCES dbo.Characters(CharacterId),
        CONSTRAINT FK_Friendships_Char2 FOREIGN KEY (CharacterId2) REFERENCES dbo.Characters(CharacterId),
        CONSTRAINT UQ_Friendship_Pair UNIQUE (CharacterId1, CharacterId2)
    );
END
GO

-- 8. BẢNG DAILY_MINDFULNESS (Thông điệp an lạc và lời dạy mỗi ngày)
IF OBJECT_ID(N'dbo.DailyMindfulness', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DailyMindfulness (
        QuoteId INT IDENTITY(1,1) NOT NULL,
        QuoteText NVARCHAR(500) NOT NULL,
        Author NVARCHAR(100) NOT NULL CONSTRAINT DF_Mindfulness_Author DEFAULT N'Lời Phật Dạy',
        Category NVARCHAR(50) NOT NULL CONSTRAINT DF_Mindfulness_Category DEFAULT 'Chánh Niệm',
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Mindfulness_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_DailyMindfulness PRIMARY KEY CLUSTERED (QuoteId)
    );
END
GO

-- 9. DỮ LIỆU BAN ĐẦU (SEED DATA)
INSERT INTO dbo.Items (ItemId, ItemName, Category, Description, PriceDrops, GrowthDurationSec)
VALUES
(N'seed_lotus_pink', N'Hạt Sen Hồng', N'Seed', N'Sen hồng truyền thống thơm ngát, nở hoa sau 60 giây chăm sóc.', 10, 60),
(N'seed_lotus_white', N'Hạt Bạch Liên', N'Seed', N'Sen trắng tinh khôi biểu trưng cho tâm hồn thanh khiết.', 20, 120),
(N'flower_lotus_pink', N'Đóa Sen Hồng', N'Flower', N'Hoa sen tươi dùng để cúng dường Tam Bảo hoặc tặng bạn.', 0, 0),
(N'lantern_lotus_standard', N'Hoa Đăng Búp Sen', N'Lantern', N'Thắp sáng điều ước bình an trên mặt hồ tĩnh lặng.', 5, 0),
(N'robe_brown', N'Áo Nâu Sồng', N'Robe', N'Y phục mộc mạc của người tu tại gia.', 50, 0);

INSERT INTO dbo.DailyMindfulness (QuoteText, Author)
VALUES
(N'Tâm an vạn sự an. Bình yên đến từ bên trong, đừng tìm kiếm ở bên ngoài.', N'Lời Phật Dạy'),
(N'Hãy dịu dàng với chính mình và từ bi với vạn vật xung quanh.', N'Kinh Pháp Cú'),
(N'Hạnh phúc không phải là không có đau khổ, mà là biết an trú giữa những thăng trầm.', N'Thiền Sư Nhất Hạnh');
GO
