/**
 * chantingSystem.ts - Hệ thống Tụng Kinh & Trì Chú Phật Giáo Chùa An Lạc
 * 
 * Hỗ trợ các bài kinh và thần chú linh thiêng nhất trong Phật giáo Đại thừa:
 * 1. 📿 Chú Đại Bi (Thiên Thủ Thiên Nhãn Vô Ngại Đại Bi Tâm Đà La Ni - 84 câu chuẩn)
 * 2. 🛡️ Chú Lăng Nghiêm (Đại Phật Đảnh Thủ Lăng Nghiêm Thần Chú - Bản Tâm Chú hộ pháp)
 * 3. 📜 Bát Nhã Ba La Mật Đa Tâm Kinh (Ma Ha Bát Nhã Ba La Mật Đa Tâm Kinh)
 * 4. 🌿 Chú Dược Sư (Dược Sư Quán Đảnh Chân Ngôn - Tiêu tai diệt bệnh)
 * 5. 🌸 Chú Vãng Sanh (Bạt Nhất Thiết Nghiệp Chướng Căn Bản Đắc Sinh Tịnh Độ Đà La Ni)
 * 6. 🙏 Niệm Danh Hiệu Phật & Bồ Tát (Thập Danh Diệu Hiệu Chư Phật & Bồ Tát)
 * 
 * Tích hợp AI Voice TTS (Web Speech Synthesis tiếng Việt) đọc kinh giọng truyền cảm,
 * tự động gõ mõ gia trì nhịp nhàng theo thiền môn.
 */

export interface ChantItem {
  id: string;
  name: string;
  subName: string;
  category: "mantra" | "sutra" | "praise";
  icon: string;
  meritDescription: string;
  verses: string[];
}

export const CHANT_DATABASE: ChantItem[] = [
  // ─────────────────────────────────────────────
  // 1. CHÚ ĐẠI BI (84 CÂU CHUẨN ÂM HÁN VIỆT)
  // ─────────────────────────────────────────────
  {
    id: "dai_bi",
    name: "Chú Đại Bi",
    subName: "Đại Bi Tâm Đà La Ni (84 Câu)",
    category: "mantra",
    icon: "📿",
    meritDescription: "Tiêu trừ trăm ngàn muôn kiếp tội chướng, tăng trưởng phúc đức bồ đề vô lượng, cầu nguyện sở cầu như ý, gia đạo bình an cát tường.",
    verses: [
      "Nam mô Hắc ra đát na đa ra dạ da",
      "Nam mô a rị da",
      "Bà lô kiết đế thước bát ra da",
      "Bồ Đề tát đỏa bà da",
      "Ma ha tát đỏa bà da",
      "Ma ha ca lô ni ca da",
      "Án",
      "Tát bàn ra phạt duệ",
      "Số đát na đát tỏa",
      "Nam mô tất kiết lật đỏa y mông a rị da",
      "Bà lô kiết đế thất Phật ra lăng đà bà",
      "Nam mô na ra cẩn trì",
      "Hê rị ma ha bàn đa sa mế",
      "Tát bà a tha đậu du bằng",
      "A thệ dựng",
      "Tát bà tát đa na ma bà tát đa na ma bà già",
      "Ma phạt đạt đậu",
      "Đát điệt tha",
      "Án a bà lô hê",
      "Lô ca đế",
      "Ca ra đế",
      "Di hê rị",
      "Ma ha bồ đề tát đỏa",
      "Tát bà tát bà",
      "Ma ra ma ra",
      "Ma hê ma hê rị đà dựng",
      "Cu lô cu lô kiết mông",
      "Độ lô độ lô phạt xà da đế",
      "Ma ha phạt xà da đế",
      "Đà ra đà ra",
      "Địa rị ni",
      "Thất Phật ra da",
      "Giá ra giá ra",
      "Mạ mạ phạt ma ra",
      "Mục đế lệ",
      "Y hê di hê",
      "Thất na thất na",
      "A ra sâm Phật ra xá lợi",
      "Phạt sa phạt sâm",
      "Phật ra xá da",
      "Hô lô hô lô ma ra",
      "Hô lô hô lô hê rị",
      "Ta ra ta ra",
      "Tất rị tất rị",
      "Tô rô tô rô",
      "Bồ Đề dạ bồ đề dạ",
      "Bồ đà dạ bồ đà dạ",
      "Di đế rị dạ",
      "Na ra cẩn trì",
      "Địa rị sắc ni na",
      "Ba dạ ma na",
      "Ta bà ha",
      "Tất đà dạ",
      "Ta bà ha",
      "Ma ha tất đà dạ",
      "Ta bà ha",
      "Tất đà dũ nghệ",
      "Thất bàn ra dạ",
      "Ta bà ha",
      "Na ra cẩn trì",
      "Ta bà ha",
      "Ma ra na ra",
      "Ta bà ha",
      "Tất ra tăng a mục khê da",
      "Ta bà ha",
      "Ta bà ma ha a tất đà dạ",
      "Ta bà ha",
      "Giả kiết ra a tất đà dạ",
      "Ta bà ha",
      "Ba đà ma kiết tất đà dạ",
      "Ta bà ha",
      "Na ra cẩn trì bàn đà ra dạ",
      "Ta bà ha",
      "Ma bà lị thắng kiết ra dạ",
      "Ta bà ha",
      "Nam mô hắc ra đát na đa ra dạ da",
      "Nam mô a rị da",
      "Bà lô kiết đế",
      "Thước bàn ra dạ",
      "Ta bà ha",
      "Án tất điện đô",
      "Mạn đa ra",
      "Bạt đà dạ",
      "Ta bà ha!"
    ]
  },

  // ─────────────────────────────────────────────
  // 2. CHÚ LĂNG NGHIÊM (TÂM CHÚ HỘ PHÁP OAI LỰC)
  // ─────────────────────────────────────────────
  {
    id: "lang_nghiem",
    name: "Chú Lăng Nghiêm",
    subName: "Đại Phật Đảnh Thủ Lăng Nghiêm Tâm Chú",
    category: "mantra",
    icon: "🛡️",
    meritDescription: "Hộ trì chánh pháp, bạt trừ ma chướng tà khúc, phá tan sợ hãi mê muội, đắc thân kim cang bất hoại và định lực Bát Nhã sâu dày.",
    verses: [
      "Nam mô Lăng Nghiêm Hội Thượng Phật Bồ Tát (cúi lạy)",
      "Nam mô Lăng Nghiêm Hội Thượng Phật Bồ Tát (cúi lạy)",
      "Nam mô Lăng Nghiêm Hội Thượng Phật Bồ Tát (cúi lạy)",
      "Diệu trạm tổng trì bất động tôn",
      "Thủ Lăng Nghiêm Vương thế hy hữu",
      "Tiêu ngã ức kiếp điên đảo tưởng",
      "Bất lịch tăng kỳ hoạch pháp thân",
      "Nguyện kim đắc quả thành bảo vương",
      "Hoàn độ như thị hằng sa chúng",
      "Tương thử thâm tâm phụng trần sát",
      "Thị tắc danh vi báo Phật ân",
      "Phục thỉnh Thế Tôn vị chứng minh",
      "Ngũ trược ác thế thệ tiên nhập",
      "Như nhất chúng sanh vị thành Phật",
      "Chung bất ư thử thủ nê hoàn",
      "Đại hùng đại lực đại từ bi",
      "Hy cánh thẩm trừ vi tế hoặc",
      "Linh ngã tảo đăng vô thượng giác",
      "Ư thập phương giới toạ đạo tràng",
      "Thuấn nhã đa tính khả tiêu vong",
      "Đặc ca ra tâm vô động chuyển",
      "Đát điệt tha:",
      "Án, a na lệ, tì xá đề",
      "Bệ ra bạt xà ra đà rị",
      "Bàn đà bàn đà nễ",
      "Bạt xà ra báng ni phấn",
      "Hổ hồng đô lô ung phấn",
      "Ta bà ha!"
    ]
  },

  // ─────────────────────────────────────────────
  // 3. BÁT NHÃ BA LA MẬT ĐA TÂM KINH
  // ─────────────────────────────────────────────
  {
    id: "bat_nha",
    name: "Bát Nhã Tâm Kinh",
    subName: "Ma Ha Bát Nhã Ba La Mật Đa Tâm Kinh",
    category: "sutra",
    icon: "📜",
    meritDescription: "Khai mở trí tuệ Tính Không vô ngại, thấu suốt chân lý vạn pháp duyên sinh, dứt trừ phiền não khổ đau, đạt đến bờ giác an lạc Niết Bàn.",
    verses: [
      "Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời",
      "Chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách",
      "Xá Lợi Tử! Sắc bất dị không, không bất dị sắc",
      "Sắc tức thị không, không tức thị sắc",
      "Thọ, tưởng, hành, thức, diệc phục như thị",
      "Xá Lợi Tử! Thị chư pháp không tướng",
      "Bất sanh, bất diệt, bất cấu, bất tịnh, bất tăng, bất giảm",
      "Thị cố không trung vô sắc, vô thọ, tưởng, hành, thức",
      "Vô nhãn, nhĩ, tỷ, thiệt, thân, ý",
      "Vô sắc, thanh, hương, vị, xúc, pháp",
      "Vô nhãn giới nãi chí vô ý thức giới",
      "Vô vô minh, diệc vô vô minh tận",
      "Nãi chí vô lão tử, diệc vô lão tử tận",
      "Vô khổ, tập, diệt, đạo",
      "Vô trí diệc vô đắc, dĩ vô sở đắc cố",
      "Bồ Đề tát đỏa y Bát Nhã Ba La Mật Đa cố",
      "Tâm vô quái ngại, vô quái ngại cố vô hữu khủng bố",
      "Viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn",
      "Tam thế chư Phật y Bát Nhã Ba La Mật Đa cố",
      "Đắc A Nậu Đa La Tam Miệu Tam Bồ Đề",
      "Cố tri Bát Nhã Ba La Mật Đa thị đại thần chú",
      "Thị đại minh chú, thị vô thượng chú, thị vô đẳng đẳng chú",
      "Năng trừ nhất thiết khổ, chân thật bất hư",
      "Cố thuyết Bát Nhã Ba La Mật Đa chú, tức thuyết chú viết:",
      "Yết đế, yết đế, ba la yết đế",
      "Ba la tăng yết đế, Bồ đề tát bà ha!"
    ]
  },

  // ─────────────────────────────────────────────
  // 4. CHÚ DƯỢC SƯ (DƯỢC SƯ QUÁN ĐẢNH CHÂN NGÔN)
  // ─────────────────────────────────────────────
  {
    id: "duoc_su",
    name: "Chú Dược Sư",
    subName: "Dược Sư Quán Đảnh Chân Ngôn",
    category: "mantra",
    icon: "🌿",
    meritDescription: "Cầu nguyện Dược Sư Lưu Ly Quang Vương Phật gia hộ tiêu trừ bệnh tật thân tâm, tai ương hoạn nạn dứt trừ, gia quyến bình an khang kiện trường thọ.",
    verses: [
      "Nam mô Bạc Già Phạt Đế",
      "Bệ Sát Xã, Lũ Lô Thích Lưu Ly",
      "Bát Lặc Bà, Hắc Ra Xà Da",
      "Đát Tha Yết Đa Da",
      "A Ra Ha Đế",
      "Tam Miệu Tam Bột Đà Da",
      "Đát Điệt Tha:",
      "Án,",
      "Bệ Sát Thệ, Bệ Sát Thệ,",
      "Bệ Sát Xã, Tam Một Yết Đế",
      "Ta bà ha!"
    ]
  },

  // ─────────────────────────────────────────────
  // 5. CHÚ VÃNG SANH
  // ─────────────────────────────────────────────
  {
    id: "vang_sanh",
    name: "Chú Vãng Sanh",
    subName: "Bạt Nhất Thiết Nghiệp Chướng Đắc Sinh Tịnh Độ",
    category: "mantra",
    icon: "🌸",
    meritDescription: "Diệt trừ mười ác nghiệp, tội chướng đời trước thảy đều tiêu sạch, hiện đời an lạc tự tại, lâm chung vãng sanh cõi Cực Lạc của Đức Phật A Di Đà.",
    verses: [
      "Nam mô a di đa bà dạ",
      "Đa tha già đa dạ",
      "Đa địa dạ tha:",
      "A di rị đô bà tỳ",
      "A di rị đa tất đam bà tỳ",
      "A di rị đa tì ca lan đế",
      "A di rị đa tì ca lan đa",
      "Già di nị, già già na",
      "Chỉ đa ca lệ, ta bà ha!"
    ]
  },

  // ─────────────────────────────────────────────
  // 6. CHÚ CHUẨN ĐỀ (THẤT CÂU CHI PHẬT MẪU ĐÀ LA NI)
  // ─────────────────────────────────────────────
  {
    id: "chuan_de",
    name: "Chú Chuẩn Đề",
    subName: "Thất Câu Chi Phật Mẫu Chuẩn Đề Đà La Ni",
    category: "mantra",
    icon: "🪷",
    meritDescription: "Tiêu trừ nghiệp chướng nhiều đời, cầu con cầu tự như ý, phúc huệ tăng trưởng, thọ mạng miên trường.",
    verses: [
      "Khể thủ quy y Tô tất đế",
      "Đầu diện đảnh lễ Thất câu chi",
      "Ngã kim xưng tán Đại Chuẩn Đề",
      "Duy nguyện từ bi thùy gia hộ",
      "Nam mô Tát đa nẫm",
      "Tam miệu tam bồ đề",
      "Câu chi nẫm",
      "Đát điệt tha",
      "Án Chiết lệ chủ lệ",
      "Chuẩn Đề ta bà ha"
    ]
  },

  // ─────────────────────────────────────────────
  // 7. CHÚ TIÊU TAI CÁT TƯỜNG (TIÊU TAI DIỆT ÁCH)
  // ─────────────────────────────────────────────
  {
    id: "tieu_tai",
    name: "Chú Tiêu Tai Cát Tường",
    subName: "Tiêu Tai Cát Tường Thần Chú",
    category: "mantra",
    icon: "✨",
    meritDescription: "Dứt trừ ách nạn sao xấu, tiêu tai giải hạn, gia đạo hưng long, vạn sự bình an như ý.",
    verses: [
      "Nẵng mồ tam mãn đa",
      "Mẫu đà nẫm",
      "A bát ra để",
      "Hạ đa xá",
      "Ta nẵng nẫm",
      "Đát điệt tha",
      "Án khê khê",
      "Khê hê khê hê",
      "Hồng hồng",
      "Nhập phạ ra",
      "Nhập phạ ra",
      "Bát ra nhập phạ ra",
      "Bát ra nhập phạ ra",
      "Để sắc sá",
      "Để sắc sá",
      "Sắc trí rị",
      "Sắc trí rị",
      "Ta phấn tra",
      "Ta phấn tra",
      "Phiến đề ca",
      "Thất rị duệ",
      "Ta bà ha"
    ]
  },

  // ─────────────────────────────────────────────
  // 8. CHÚ LỤC TỰ ĐẠI MINH (OM MANI PADME HUM)
  // ─────────────────────────────────────────────
  {
    id: "luc_tu",
    name: "Lục Tự Chân Ngôn",
    subName: "Án Ma Ni Bát Mê Hồng (Quán Thế Âm Bồ Tát)",
    category: "mantra",
    icon: "💎",
    meritDescription: "Trì tụng sáu chữ vàng phá trừ vô minh u tối, đóng cánh cửa sáu nẻo luân hồi, thành tựu quả vị bồ đề.",
    verses: [
      "Án Ma Ni Bát Mê Hồng",
      "Án Ma Ni Bát Mê Hồng",
      "Án Ma Ni Bát Mê Hồng",
      "Nam Mô Quán Thế Âm Bồ Tát",
      "Án Ma Ni Bát Mê Hồng",
      "Án Ma Ni Bát Mê Hồng",
      "Án Ma Ni Bát Mê Hồng",
      "Nam Mô Đại Bi Quán Thế Âm Bồ Tát"
    ]
  },

  // ─────────────────────────────────────────────
  // 9. KINH PHỔ MÔN (PHẨM PHỔ MÔN KỆ TỤNG)
  // ─────────────────────────────────────────────
  {
    id: "pho_mon",
    name: "Kinh Phổ Môn",
    subName: "Quán Thế Âm Bồ Tát Phổ Môn Phẩm",
    category: "sutra",
    icon: "📜",
    meritDescription: "Cứu khổ cứu nạn trong muôn trùng hiểm nguy, quán xét tiếng kêu cầu của muôn loài để đến độ thoát.",
    verses: [
      "Thế Tôn tướng tốt đủ",
      "Con nay lại hỏi kia",
      "Phật tử nhân duyên gì",
      "Tên là Quán Thế Âm?",
      "Đấng Đầy Đủ Tướng Tốt",
      "Kệ đáp Vô Tận Ý:",
      "Bạn nghe hạnh Quán Âm",
      "Khéo ứng các nơi nơi",
      "Biển thệ rộng sâu thẳm",
      "Nhiều kiếp chẳng nghĩ bàn",
      "Hầu nhiều nghìn đức Phật",
      "Phát nguyện thanh tịnh lớn",
      "Ta vì bạn nói lược",
      "Nghe tên cùng thấy thân",
      "Tâm niệm chớ luống qua",
      "Hay diệt khổ các cõi",
      "Giả sử sinh lòng hại",
      "Xô rớt hầm lửa lớn",
      "Do sức niệm Quán Âm",
      "Hầm lửa biến thành hồ",
      "Hoặc trôi dạt biển lớn",
      "Các nạn quỷ cá rồng",
      "Do sức niệm Quán Âm",
      "Sóng chìm chẳng nổi chìm",
      "Mắt lành trông chúng sinh",
      "Biển phước gom không lượng",
      "Vì thế nên kính lễ",
      "Nam Mô Quán Thế Âm Bồ Tát"
    ]
  },

  // ─────────────────────────────────────────────
  // 10. KINH A DI ĐÀ (CÕI CỰC LẠC TRANG NGHIÊM)
  // ─────────────────────────────────────────────
  {
    id: "a_di_da",
    name: "Kinh A Di Đà",
    subName: "Phật Thuyết A Di Đà Kinh Tán Tụng",
    category: "sutra",
    icon: "🌺",
    meritDescription: "Nguyện vãng sanh Tây Phương Cực Lạc, hoa khai kiến Phật ngộ vô sanh, bất thối chuyển bồ đề.",
    verses: [
      "Từ cõi Ta Bà này",
      "Qua mười muôn ức cõi",
      "Có thế giới Cực Lạc",
      "Đức Phật hiệu Di Đà",
      "Hiện nay đang thuyết pháp",
      "Cõi nước ấy trang nghiêm",
      "Bảy tầng lan can ngọc",
      "Bảy tầng lưới giăng giăng",
      "Bảy tầng hàng cây báu",
      "Bốn bề toàn châu báu",
      "Lại có hồ bảy báu",
      "Nước tám công đức đầy",
      "Đáy hồ trải cát vàng",
      "Hoa sen lớn như bánh xe",
      "Sắc xanh ánh sáng xanh",
      "Sắc vàng ánh sáng vàng",
      "Sắc đỏ ánh sáng đỏ",
      "Sắc trắng ánh sáng trắng",
      "Màu nhiệm thơm thanh khiết",
      "Chúng sinh cõi nước ấy",
      "Không có các điều khổ",
      "Chỉ hưởng mọi điều vui",
      "Nên gọi là Cực Lạc",
      "Nam Mô Tây Phương Cực Lạc Thế Giới A Di Đà Phật"
    ]
  },

  // ─────────────────────────────────────────────
  // 11. KINH SÁM HỐI HỒNG DANH (SÁM HỐI TIÊU NGHIỆP)
  // ─────────────────────────────────────────────
  {
    id: "hong_danh",
    name: "Kinh Sám Hối",
    subName: "Hồng Danh Bửu Sám Cầu Tiêu Nghiệp Chướng",
    category: "sutra",
    icon: "🕯️",
    meritDescription: "Sám hối ba nghiệp thân khẩu ý thanh tịnh, tiêu trừ vô lượng kiếp oán thù nghiệp chướng.",
    verses: [
      "Đại từ đại bi thương chúng sinh",
      "Đại hỷ đại xả cứu hàm thức",
      "Tướng tốt sáng ngời tự trang nghiêm",
      "Chúng con chí tâm quy mạng lễ",
      "Nam Mô Phổ Quang Phật",
      "Nam Mô Phổ Minh Phật",
      "Nam Mô Phổ Tịnh Phật",
      "Nam Mô Đa Ma La Bạt Chiên Đàn Hương Phật",
      "Nam Mô Chiên Đàn Quang Phật",
      "Nam Mô Hoan Hỷ Tạng Ma Ni Bảo Tích Phật",
      "Nam Mô Dược Sư Lưu Ly Quang Vương Phật",
      "Tội từ tâm khởi đem tâm sám",
      "Tâm được tịnh rồi tội liền tiêu",
      "Tội tiêu tâm tịnh thảy đều không",
      "Thế mới thật là chân sám hối",
      "Nam Mô Cầu Sám Hối Bồ Tát Ma Ha Tát"
    ]
  },

  // ─────────────────────────────────────────────
  // 12. NIỆM PHẬT TAM BẢO
  // ─────────────────────────────────────────────
  {
    id: "niem_phat",
    name: "Niệm Phật Tam Bảo",
    subName: "Hồng Danh Chư Phật & Đại Bồ Tát",
    category: "praise",
    icon: "🙏",
    meritDescription: "Nhất tâm hướng Phật, gieo trồng hạt giống thiện lành vô thượng, thân tâm an trụ trong hào quang từ bi chiếu soi của Chư Phật mười phương.",
    verses: [
      "Nam Mô Thập Phương Thường Trụ Tam Bảo tác đại chứng minh",
      "Nam Mô Bổn Sư Thích Ca Mâu Ni Phật",
      "Nam Mô Bổn Sư Thích Ca Mâu Ni Phật",
      "Nam Mô A Di Đà Phật",
      "Nam Mô A Di Đà Phật",
      "Nam Mô Đương Lai Hạ Sanh Di Lặc Tôn Phật",
      "Nam Mô Đại Bi Quán Thế Âm Bồ Tát",
      "Nam Mô Đại Trí Văn Thù Sư Lợi Bồ Tát",
      "Nam Mô Đại Hạnh Phổ Hiền Bồ Tát",
      "Nam Mô Đại Thế Chí Bồ Tát",
      "Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát",
      "Nam Mô Thanh Tịnh Đại Hải Chúng Bồ Tát"
    ]
  }
];

/**
 * Lớp điều khiển Giọng đọc AI (Web Speech Synthesis Engine)
 * Tinh chỉnh âm điệu thiền môn, tiết tấu từ tốn thanh thoát
 */
export class ChantingVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private voiceEnabled: boolean = true;
  private speechRate: number = 1.15; // Tăng tốc độ đọc của AI lên nhanh, lưu loát, dứt khoát

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Ưu tiên các giọng tiếng Việt chất lượng cao (Google Tiếng Việt, Microsoft HoaiMy, etc.)
    const vnVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("vi") ||
        v.name.toLowerCase().includes("vietnam") ||
        v.name.toLowerCase().includes("hoaimy") ||
        v.name.toLowerCase().includes("nam")
    );
    if (vnVoice) {
      this.preferredVoice = vnVoice;
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled && this.isSpeaking) {
      this.stop();
    }
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setRate(rate: number) {
    this.speechRate = rate;
  }

  public speak(
    text: string,
    onEnd?: () => void,
    onError?: () => void
  ) {
    if (!this.synth || !this.voiceEnabled) {
      onEnd?.();
      return;
    }

    this.stop();

    // Làm sạch câu kinh để TTS đọc mượt mà (bỏ dấu ngoặc chú thích nếu có)
    const cleanText = text.replace(/\(.*?\)/g, "").trim();
    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = "vi-VN";
    utter.rate = this.speechRate;
    utter.pitch = 0.95; // Giọng trầm thanh tịnh
    utter.volume = 1.0;

    if (this.preferredVoice) {
      utter.voice = this.preferredVoice;
    }

    utter.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      onEnd?.();
    };

    utter.onerror = (e) => {
      console.warn("Chanting TTS error:", e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      onError ? onError() : onEnd?.();
    };

    this.currentUtterance = utter;
    this.isSpeaking = true;
    this.synth.speak(utter);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }
  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }
}

export const chantingVoiceEngine = new ChantingVoiceEngine();
