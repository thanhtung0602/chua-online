/**
 * nameGenerator.ts - Sinh Tên Tự Động & Quản Lý Tính Duy Nhất Của Tên Người Chơi
 * Đảm bảo:
 * 1. Khách viếng chùa chưa đăng nhập khi tải lại trang (F5/vào lại web) sẽ có tên mới, nhân vật mới.
 * 2. Tên nhân vật không bao giờ bị trùng nhau (kể cả khi đã đăng nhập hay đổi tên).
 */

import type { LeaderboardPayload } from "../services/network";

const BUDDHIST_PREFIXES = ["Đạo Hữu", "Cư Sĩ", "Thiện Nam", "Tín Nữ", "Phật Tử"];

const BUDDHIST_VIRTUES = [
  "An Nhiên", "Tuệ Minh", "Diệu Tâm", "Từ Bi", "Thanh Tịnh",
  "Quảng Đức", "Vạn An", "Phúc Thiện", "Bảo An", "Trí Dũng",
  "Tâm Thanh", "Minh Triết", "Thiện Duyên", "Đức Hạnh", "Diệu Âm",
  "Chân Như", "Tâm An", "Hạnh Nguyện", "Giác Ngộ", "Thanh Lương",
  "Tịnh Độ", "Phổ Hiền", "Viên Mãn", "Bình An", "Đạt Ma",
  "Tuệ Chiếu", "Tâm Định", "Vạn Hạnh", "Quang Minh", "Diệu Hòa"
];

/**
 * Tạo một tên ngẫu nhiên độc nhất cho khách mới vào chùa
 * Ví dụ: "Đạo Hữu An Nhiên #382", "Cư Sĩ Tuệ Minh #715"
 */
export function generateUniqueGuestName(existingNames?: string[]): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const prefix = BUDDHIST_PREFIXES[Math.floor(Math.random() * BUDDHIST_PREFIXES.length)];
    const virtue = BUDDHIST_VIRTUES[Math.floor(Math.random() * BUDDHIST_VIRTUES.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3 chữ số ngẫu nhiên
    const candidate = `${prefix} ${virtue} #${num}`;

    if (!existingNames || !existingNames.some((n) => n.toLowerCase() === candidate.toLowerCase())) {
      return candidate;
    }
  }

  // Dự phòng an toàn
  return `Đạo Hữu An Lạc #${Date.now().toString().slice(-4)}`;
}

/**
 * Kiểm tra xem tên có bị trùng với người chơi khác không
 */
export function isNameTakenInGame(
  nameToCheck: string,
  currentSelfName: string,
  leaderboard?: LeaderboardPayload
): boolean {
  const clean = nameToCheck.trim().toLowerCase();
  const selfClean = currentSelfName.trim().toLowerCase();
  if (clean === selfClean) return false; // Trùng với chính mình thì hợp lệ

  if (!leaderboard) return false;

  // 1. Kiểm tra Đương Kim Trụ Trì
  if (leaderboard.currentAbbot?.name) {
    if (leaderboard.currentAbbot.name.trim().toLowerCase() === clean) {
      return true;
    }
  }

  // 2. Kiểm tra 12 Vị Cao Tăng
  if (Array.isArray(leaderboard.seniorMonks)) {
    for (const monk of leaderboard.seniorMonks) {
      if (monk.name.trim().toLowerCase() === clean) {
        return true;
      }
    }
  }

  // 3. Kiểm tra danh sách người chơi trong bảng xếp hạng
  if (Array.isArray(leaderboard.leaderboard)) {
    for (const entry of leaderboard.leaderboard) {
      if (entry.name.trim().toLowerCase() === clean) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Đảm bảo tên là duy nhất, nếu trùng thì thêm hậu tố phân biệt (#2, #3, ...)
 */
export function ensureNameIsUnique(
  rawName: string,
  isTakenCheck: (name: string) => boolean
): string {
  let name = rawName.trim();
  if (!isTakenCheck(name)) return name;

  // Thử thêm số tăng dần #2, #3...
  let counter = 2;
  while (counter <= 99) {
    const candidate = `${name} #${counter}`;
    if (!isTakenCheck(candidate)) {
      return candidate;
    }
    counter++;
  }

  return `${name} #${Math.floor(100 + Math.random() * 900)}`;
}
