/**
 * sutraLibrary.ts - Kho Tàng Kinh Điển & Hệ Thống Audio Đọc Kinh Phật Giáo
 * Tàng Kinh Các Chùa An Lạc (Scripture Library & Audio Player)
 * 
 * Tuyển tập các bộ kinh Đại Thừa & Nguyên Thủy kinh điển nhất:
 * 1. Bát Nhã Ba La Mật Đa Tâm Kinh (Ma Ha Bát Nhã)
 * 2. Kinh Pháp Cú (Dhammapada - Lời Vàng Phật Dạy)
 * 3. Kinh Phổ Môn (Phẩm Phổ Môn Bồ Tát Quán Thế Âm)
 * 4. Kinh A Di Đà (Phật Thuyết A Di Đà Kinh)
 * 5. Kinh Kim Cang Bát Nhã Ba La Mật (Kim Cương Kinh)
 * 6. Kinh Dược Sư Lưu Ly Quang Vương Như Lai
 * 7. Kinh Vu Lan Báo Hiếu (Phật Thuyết Báo Hiếu Phụ Mẫu)
 * 8. Kinh Diệu Pháp Liên Hoa (Kinh Pháp Hoa - Tuyển Phẩm Cốt Tủy)
 */

import { zenAudio } from "./audio";

export interface SutraChapter {
  id: string;
  title: string;
  subTitle?: string;
  verses: string[];
}

export interface Sutra {
  id: string;
  title: string;
  sanskritTitle: string;
  category: "wisdom" | "dharma" | "compassion" | "pureland" | "filial_piety" | "healing";
  categoryLabel: string;
  icon: string;
  coverColor: string;
  readingMinutes: number;
  description: string;
  meritExplanation: string;
  chapters: SutraChapter[];
}

export const SUTRA_DATABASE: Sutra[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. BÁT NHÃ BA LA MẬT ĐA TÂM KINH (CỐT TỦY TRÍ TUỆ BÁT NHÃ)
  // ─────────────────────────────────────────────────────────────
  {
    id: "bat_nha_tam_kinh",
    title: "Bát Nhã Ba La Mật Đa Tâm Kinh",
    sanskritTitle: "Prajñāpāramitā Hṛdaya Sūtra",
    category: "wisdom",
    categoryLabel: "Kinh Trí Tuệ",
    icon: "📜",
    coverColor: "rgba(212, 175, 55, 0.25)",
    readingMinutes: 5,
    description: "Bộ kinh cô đọng tột cùng, tóm thâu trọn vẹn 600 quyển Đại Bát Nhã, khai thị thực tướng Tánh Không để giải thoát mọi khổ đau ách nạn.",
    meritExplanation: "Tụng đọc và lắng nghe Bát Nhã Tâm Kinh giúp khai mở tuệ giác vô ngã, tâm không vướng bận sợ hãi, tiêu trừ nghiệp chướng nhiều đời, đạt tâm thái an nhiên tự tại.",
    chapters: [
      {
        id: "bat_nha_ch1",
        title: "Toàn Văn Bát Nhã Tâm Kinh (Bản Dịch Thiền Môn)",
        subTitle: "Quán Tự Tại Bồ Tát Hành Thâm Bát Nhã",
        verses: [
          "Khi Quán Tự Tại Bồ Tát thực hành sâu xa trí tuệ Bát Nhã Ba La Mật Đa,",
          "Ngài soi thấy năm uẩn đều là Không, liền vượt qua mọi khổ đau ách nạn.",
          "Này Xá Lợi Tử! Sắc chẳng khác Không, Không chẳng khác Sắc.",
          "Sắc tức là Không, Không tức là Sắc.",
          "Thọ, Tưởng, Hành, Thức cũng đều như thế cả.",
          "Này Xá Lợi Tử! Tướng Không của mọi pháp chẳng sinh, chẳng diệt,",
          "Chẳng dơ, chẳng sạch, chẳng thêm, chẳng bớt.",
          "Cho nên trong Chân Không không có Sắc, không có Thọ, Tưởng, Hành, Thức;",
          "Không có Mắt, Tai, Mũi, Lưỡi, Thân, Ý;",
          "Không có Sắc, Thanh, Hương, Vị, Xúc, Pháp;",
          "Không có Nhãn giới cho đến không có Ý thức giới.",
          "Không có Vô minh cũng không có hết Vô minh;",
          "Cho đến không có Già Chết cũng không có hết Già Chết.",
          "Không có Khổ, Tập, Diệt, Đạo; Không có Trí tuệ cũng không có Đắc chứng.",
          "Vì không có chỗ đắc, nên Bồ Tát nương tựa nơi Trí tuệ Bát Nhã Ba La Mật Đa,",
          "Tâm không hề ngăn ngại. Vì tâm không ngăn ngại nên không sợ hãi,",
          "Xa lìa mọi mộng tưởng điên đảo, đạt đến cảnh giới Cứu Cánh Niết Bàn.",
          "Chư Phật trong ba đời cũng đều nương Trí tuệ Bát Nhã Ba La Mật Đa,",
          "Mà chứng đắc quả vị Vô Thượng Chánh Đẳng Chánh Giác.",
          "Nên biết Bát Nhã Ba La Mật Đa là thần chú đại linh thiêng,",
          "Là thần chú đại minh, là thần chú tối thượng, là thần chú không gì sánh bằng,",
          "Trừ dứt mọi khổ não, chân thật không hư dối.",
          "Vì vậy ngài liền tuyên thuyết Thần Chú Bát Nhã Ba La Mật Đa rằng:",
          "Yết đế, yết đế, ba la yết đế, ba la tăng yết đế, bồ đề tát bà ha!",
          "Qua rồi, qua rồi, qua bờ bên kia rồi, tất cả qua bờ giác ngộ, viên mãn an vui!"
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 2. KINH PHÁP CÚ (DHAMMAPADA - LỜI VÀNG PHẬT DẠY)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_phap_cu",
    title: "Kinh Pháp Cú (Dhammapada)",
    sanskritTitle: "Dhammapada — Lời Phật Dạy",
    category: "dharma",
    categoryLabel: "Kinh Căn Bản",
    icon: "🪷",
    coverColor: "rgba(230, 126, 34, 0.25)",
    readingMinutes: 12,
    description: "Tuyển tập những kệ ngôn chân lý do Đức Phật Thích Ca Mâu Ni thuyết giảng, được ví như ngọn hải đăng bất diệt dẫn dắt con người vượt qua cõi mê.",
    meritExplanation: "Chiêm nghiệm từng lời dạy trong Kinh Pháp Cú giúp hành giả nhận diện cội nguồn tâm thức, chuyển hóa nóng giận tham sân, vun bồi từ bi và trí tuệ chân thật.",
    chapters: [
      {
        id: "phap_cu_song_yeu",
        title: "Phẩm I: Song Yếu (Yamakavagga)",
        subTitle: "Tâm Dẫn Đầu Mọi Nghiệp Quả",
        verses: [
          "Ý dẫn đầu các pháp, ý làm chủ tạo tác.",
          "Nếu với ý ô nhiễm, nói năng hay hành động,",
          "Khổ não sẽ theo sau, như xe theo chân vật kéo.",
          "Ý dẫn đầu các pháp, ý làm chủ tạo tác.",
          "Nếu với ý thanh tịnh, nói năng hay hành động,",
          "An lạc sẽ theo sau, như bóng chẳng rời hình.",
          "Họ đã mắng nhiếc tôi, họ đã đánh đập tôi, họ đã cướp đoạt của tôi.",
          "Ai ôm ấp niềm oán hận ấy, hận thù không bao giờ nguôi dứt.",
          "Thật vậy ở thế gian, hận thù không bao giờ dập tắt được hận thù.",
          "Chỉ có tình thương và lòng từ bi mới dập tắt được hận thù. Đó là định luật ngàn đời."
        ]
      },
      {
        id: "phap_cu_tam",
        title: "Phẩm III: Tâm (Cittavagga)",
        subTitle: "Thanh Lọc Và Thu Thúc Tâm Ý",
        verses: [
          "Tâm chao đảo dao động, khó che chở gìn giữ.",
          "Người trí làm tâm thẳng, như thợ chuốt mũi tên.",
          "Như con cá vớt lên, quăng trên bờ đất khô,",
          "Tâm này luôn run rẩy, hãy thoát khỏi cõi ma.",
          "Tâm khó thấy tế nhị, theo các dục quay cuồng.",
          "Người trí phòng hộ tâm, tâm an lạc đưa tới.",
          "Kẻ thù hại kẻ thù, oan gia hại oan gia,",
          "Chẳng bằng tâm hướng tà, gây tai họa cho mình.",
          "Không phải mẹ hay cha, cũng không bà con nào,",
          "Bằng tâm hướng chánh thiện, đem lại phúc lành cao."
        ]
      },
      {
        id: "phap_cu_ngan",
        title: "Phẩm VIII: Ngàn (Sahassavagga)",
        subTitle: "Một Lời An Tịnh Quý Hơn Ngàn Lời Vô Nghĩa",
        verses: [
          "Dầu nói ngàn lời nói, nhưng vô nghĩa rỗng không,",
          "Chẳng bằng một lời có ý nghĩa, người nghe được an tịnh.",
          "Dầu đọc ngàn bài kệ, nhưng vô nghĩa chẳng lành,",
          "Chẳng bằng đọc một câu kệ đạo, nghe xong tâm an ổn.",
          "Chiến thắng vạn quân thù trên chiến trường oanh liệt,",
          "Không bằng tự chiến thắng chính mình. Chiến thắng ấy là vẻ vang nhất.",
          "Tự chiến thắng chính mình, thắng lợi ấy vĩnh viễn không ai cướp đoạt được,",
          "Dù là chư thiên, ma vương hay phạm thiên cũng không phá vỡ nổi."
        ]
      },
      {
        id: "phap_cu_dao",
        title: "Phẩm XX: Con Đường (Maggavagga)",
        subTitle: "Bát Chánh Đạo Tối Thắng",
        verses: [
          "Trong các con đường, Bát Chánh Đạo là tối thắng.",
          "Trong các chân lý, Tứ Diệu Đế là tối thắng.",
          "Trong các trạng thái, Ly Dục là tối thắng.",
          "Trong các loài hai chân, Đấng Có Mắt Tuệ Giác là tối thắng.",
          "Đây là con đường duy nhất, không có con đường nào khác đưa đến thanh tịnh tri kiến.",
          "Hãy đi trên con đường này, quý vị sẽ làm Ma vương lúng túng mất phương hướng.",
          "Các ngươi phải tự mình nỗ lực, Như Lai chỉ là bậc đạo sư chỉ đường.",
          "Ai bước vào chánh đạo và hành thiền, người ấy sẽ giải thoát khỏi sự ràng buộc của ác ma."
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 3. KINH PHỔ MÔN (BỒ TÁT QUÁN THẾ ÂM TẦM THANH CỨU KHỔ)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_pho_mon",
    title: "Kinh Phổ Môn (Bồ Tát Quán Thế Âm)",
    sanskritTitle: "Avalokiteśvara Samantamukha Parivarta",
    category: "compassion",
    categoryLabel: "Kinh Cứu Khổ",
    icon: "🌊",
    coverColor: "rgba(52, 152, 219, 0.25)",
    readingMinutes: 8,
    description: "Phẩm Phổ Môn thứ 25 trong Kinh Diệu Pháp Liên Hoa ngợi ca hạnh nguyện từ bi vô tận của Bồ Tát Quán Thế Âm luôn lắng nghe tiếng kêu cầu mà cứu độ.",
    meritExplanation: "Tụng đọc Kinh Phổ Môn mang lại sự che chở linh thiêng, giải tỏa sợ hãi lo âu, chuyển hóa hoạn nạn hiểm nguy thành an lành, gia đạo thuận hòa.",
    chapters: [
      {
        id: "pho_mon_ch1",
        title: "Bản Nguyện Tầm Thanh Cứu Khổ",
        subTitle: "Hễ Xưng Danh Hiệu Liền Được Giải Thoát",
        verses: [
          "Lúc bấy giờ Bồ Tát Vô Tận Ý từ chỗ ngồi đứng dậy, trắc áo vai hữu, chắp tay hướng Phật bạch rằng:",
          "Bạch Đức Thế Tôn! Vì duyên cớ gì mà Bồ Tát Quán Thế Âm có tên gọi là Quán Thế Âm?",
          "Phật bảo Bồ Tát Vô Tận Ý:",
          "Này thiện nam tử! Nếu có vô lượng trăm ngàn muôn ức chúng sinh chịu nhiều khổ não,",
          "Nghe danh hiệu Quán Thế Âm Bồ Tát này, một lòng xưng niệm danh hiệu,",
          "Bồ Tát tức thời quán sát tiếng kêu cầu ấy, khiến cho tất cả đều được giải thoát.",
          "Dẫu người rơi vào đống lửa lớn, do sức oai thần của Bồ Tát, lửa chẳng thể cháy được.",
          "Dẫu người trôi dạt giữa biển cả mênh mông bão tố, xưng niệm danh hiệu Bồ Tát, liền tới được bến cạn an toàn.",
          "Nếu có chúng sinh bị gông cùm xiềng xích vây hãm, xưng niệm danh hiệu Bồ Tát, xiềng xích gãy đoạn, liền được tự do.",
          "Bồ Tát Quán Thế Âm có sức thần thông to lớn, hay ban cho chúng sinh niềm an ổn vô úy giữa cõi đời nhiễu nhương."
        ]
      },
      {
        id: "pho_mon_ke",
        title: "Bài Kệ Tán Thán Thần Lực Phổ Môn",
        subTitle: "Diệu Âm Quán Thế Âm — Từ Nhãn Thị Chúng Sinh",
        verses: [
          "Thế Tôn tướng tốt đẹp, con nay lại thưa hỏi,",
          "Bồ Tát Quán Thế Âm, do duyên gì tên gọi?",
          "Đấng đầy đủ tướng quý, kệ đáp Vô Tận Ý:",
          "Lắng nghe hạnh Quán Âm, khéo ứng các nơi chốn.",
          "Nguyện lớn sâu như biển, nhiều kiếp chẳng nghĩ bàn,",
          "Hầu nhiều ngàn muôn Phật, phát nguyện thanh tịnh lớn.",
          "Nghe danh cùng thấy thân, tâm niệm không luống qua,",
          "Có thể diệt trừ được, mọi khổ đau ách nạn.",
          "Trí tuệ thanh tịnh sáng, như mặt trời phá tan tối tăm,",
          "Khéo dập tắt ngọn lửa gió bão tai ương, soi sáng khắp thế gian.",
          "Lòng từ bi như sấm nổ vang rền, lòng nhân ái tựa làn mây mát dịu,",
          "Rưới mưa pháp cam lồ thanh tịnh, dập tắt ngọn lửa phiền não thiêu đốt.",
          "Diệu âm, Quán Âm, Phạm âm, Hải triều âm,",
          "Tiếng mầu nhiệm vượt trên âm thanh thế gian, thế nên thường phải niệm.",
          "Mắt lành nhìn chúng sinh, biển phước lớn không lường,",
          "Bởi thế nên cung kính, đảnh lễ Đấng Quán Âm."
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 4. KINH A DI ĐÀ (CẢNH GIỚI CỰC LẠC TRANG NGHIÊM)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_a_di_da",
    title: "Kinh Phật Thuyết A Di Đà",
    sanskritTitle: "Sukhāvatīvyūha Sūtra",
    category: "pureland",
    categoryLabel: "Kinh Tịnh Độ",
    icon: "🛕",
    coverColor: "rgba(241, 196, 15, 0.25)",
    readingMinutes: 10,
    description: "Bộ kinh căn bản của pháp môn Tịnh Độ miêu tả cảnh giới Tây Phương Cực Lạc của Đức Phật A Di Đà trang nghiêm vi diệu, không có mọi nỗi khổ trần thế.",
    meritExplanation: "Chí tâm trì tụng kinh A Di Đà và niệm Phật nhất tâm bất loạn sẽ được mười phương chư Phật đồng hộ niệm, khi mạng chung được vãng sanh cõi Phật thanh tịnh.",
    chapters: [
      {
        id: "a_di_da_ch1",
        title: "Cảnh Giới Trang Nghiêm Nơi Cõi Cực Lạc",
        subTitle: "Cõi Nước Không Có Khổ Não, Chỉ Hưởng Niềm Vui",
        verses: [
          "Tôi nghe như vầy: Một thuở nọ Đức Phật ở tại tinh xá Kỳ Viên, nước Xá Vệ,",
          "Cùng với một ngàn hai trăm năm mươi vị đại Tỳ-kheo và vô số đại Bồ Tát.",
          "Bấy giờ Đức Phật bảo Trưởng lão Xá Lợi Phất rằng:",
          "Từ cõi này đi về hướng Tây, qua mười muôn ức cõi Phật,",
          "Có một thế giới tên là Cực Lạc. Nơi cõi đó có Đức Phật hiệu là A Di Đà hiện đang thuyết pháp.",
          "Này Xá Lợi Phất! Cõi đó vì sao tên là Cực Lạc?",
          "Vì chúng sinh trong cõi đó không có các điều khổ, chỉ hưởng những điều vui, nên gọi là Cực Lạc.",
          "Lại nữa cõi Cực Lạc có bảy tầng lan can, bảy tầng lưới giăng, bảy tầng hàng cây,",
          "Đều bằng bốn báu châu báu vây quanh, cho nên cõi ấy tên là Cực Lạc.",
          "Nơi cõi Cực Lạc lại có ao bằng bảy báu, chứa đầy nước tám công đức thanh lương cam ngọt.",
          "Đáy ao thuần rải cát vàng. Bốn bên thềm ngọc vàng bạc, lưu ly, pha lê.",
          "Hoa sen trong ao lớn như bánh xe, sắc biếc ánh sáng biếc, sắc vàng ánh sáng vàng, sắc đỏ ánh sáng đỏ, sắc trắng ánh sáng trắng, vi diệu hương thơm tinh khiết."
        ]
      },
      {
        id: "a_di_da_ch2",
        title: "Pháp Môn Trì Niệm Danh Hiệu Vãng Sanh",
        subTitle: "Nhất Tâm Bất Loạn — Chư Phật Đồng Tán Thán",
        verses: [
          "Này Xá Lợi Phất! Đức Phật đó vì sao có hiệu là A Di Đà?",
          "Vì ánh sáng của Đức Phật ấy vô lượng, soi sáng khắp mười phương cõi nước không hề ngăn ngại, nên gọi là A Di Đà.",
          "Lại nữa thọ mạng của Đức Phật ấy và nhân dân cõi ấy sống lâu vô lượng vô biên vô số kiếp, nên gọi là A Di Đà.",
          "Này Xá Lợi Phất! Nếu có thiện nam tử, thiện nữ nhân nào nghe nói về Đức Phật A Di Đà,",
          "Rồi chấp trì danh hiệu của Ngài, hoặc một ngày, hai ngày, ba ngày, cho đến bảy ngày, một lòng không xao động lộn xộn,",
          "Thì khi người ấy lâm chung, Đức Phật A Di Đà cùng Thánh chúng hiện ra trước mặt.",
          "Tâm thần người ấy chẳng điên đảo, liền được vãng sanh về cõi nước Cực Lạc thanh tịnh.",
          "Này Xá Lợi Phất! Ta thấy điều lợi ích lớn lao này nên nói lời chân thật ấy.",
          "Chúng sinh nào nghe lời này nên phát nguyện cầu sanh về cõi nước Cực Lạc."
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 5. KINH KIM CANG (KIM CANG BÁT NHÃ BA LA MẬT)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_kim_cang",
    title: "Kinh Kim Cang Bát Nhã",
    sanskritTitle: "Vajracchedikā Prajñāpāramitā Sūtra",
    category: "wisdom",
    categoryLabel: "Kinh Kim Cương",
    icon: "💎",
    coverColor: "rgba(155, 89, 182, 0.25)",
    readingMinutes: 10,
    description: "Bộ kinh tối thượng phá vỡ mọi chấp trước tướng trạng, soi tỏ tánh Không vô ngã như lưỡi kiếm kim cương chém đứt mọi vọng tưởng mê lầm.",
    meritExplanation: "Người thọ trì, đọc tụng và giảng giải dù chỉ một bài kệ bốn câu trong Kinh Kim Cang, phước đức lớn lao hơn cả đem bảy báu bố thí đầy khắp tam thiên đại thiên thế giới.",
    chapters: [
      {
        id: "kim_cang_ch1",
        title: "Ưng Vô Sở Trụ Nhi Sanh Kỳ Tâm",
        subTitle: "Phá Chấp Bốn Tướng: Ngã, Nhân, Chúng Sinh, Thọ Giả",
        verses: [
          "Bấy giờ Tôn giả Tu Bồ Đề ở trong đại chúng liền từ chỗ ngồi đứng dậy, bạch Phật rằng:",
          "Bạch Đức Thế Tôn! Thiện nam tử, thiện nữ nhân phát tâm Vô Thượng Chánh Đẳng Chánh Giác,",
          "Nên an trụ tâm như thế nào, làm sao hàng phục tâm mình?",
          "Đức Phật dạy: Này Tu Bồ Đề! Bồ Tát độ hết thảy mọi loài chúng sinh vào cõi vô dư Niết Bàn,",
          "Diệt độ như thế mà thật không có một chúng sinh nào được diệt độ.",
          "Vì sao vậy? Này Tu Bồ Đề! Nếu Bồ Tát còn thấy có tướng Ta (Ngã), tướng Người (Nhân),",
          "Tướng Chúng sinh, tướng Thọ giả thì không phải là Bồ Tát chân thật.",
          "Bồ Tát đối với các pháp chẳng nên trụ vào đâu mà thực hành bố thí,",
          "Chẳng trụ vào hình sắc mà bố thí, chẳng trụ vào thanh, hương, vị, xúc, pháp mà bố thí.",
          "Không nên trụ vào sắc sinh tâm, không nên trụ vào thanh hương vị xúc pháp sinh tâm,",
          "Nên sinh tâm không trụ vào bất cứ nơi đâu (Ưng vô sở trụ nhi sanh kỳ tâm)."
        ]
      },
      {
        id: "kim_cang_ke",
        title: "Kệ Tứ Cú Kim Cương Bất Hủ",
        subTitle: "Như Mộng, Ảo Ảnh, Bọt Nước, Sương Mai",
        verses: [
          "Phàm tất cả những gì có hình tướng, thảy đều là hư vọng dối giả.",
          "Nếu thấy các tướng đều chẳng phải là tướng, tức là nhìn thấy Như Lai chân thật.",
          "Nếu dùng hình sắc để tìm Ta, lấy âm thanh cầu Ta,",
          "Người ấy đang hành tà đạo, không thể thấy Như Lai.",
          "Tất cả các pháp hữu vi sinh diệt,",
          "Đều như giấc mộng huyễn, như bọt nước phù du,",
          "Như hạt sương mai đầu ngọn cỏ, như tia chớp lóe sáng giữa trời.",
          "Hãy thường xuyên quán chiếu sâu xa như thế, tâm sẽ dứt sạch mọi trói buộc khổ đau!"
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 6. KINH DƯỢC SƯ LƯU LY QUANG VƯƠNG NHƯ LAI
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_duoc_su",
    title: "Kinh Dược Sư Bản Nguyện Công Đức",
    sanskritTitle: "Bhaiṣajyaguru Sūtra",
    category: "healing",
    categoryLabel: "Kinh Tiêu Tai Diên Thọ",
    icon: "🌿",
    coverColor: "rgba(46, 204, 113, 0.25)",
    readingMinutes: 8,
    description: "Kinh tụng ca 12 đại nguyện cứu độ của Đức Phật Dược Sư, tiêu trừ bệnh tật thân tâm, giải trừ oan gia trái chủ, mang lại trường thọ và an lạc.",
    meritExplanation: "Trì tụng Kinh Dược Sư giúp hóa giải tai ương nạn ách, thân thể khoẻ mạnh tráng kiện, tâm hồn an vui, phước lộc tràn đầy, gia đạo bình an.",
    chapters: [
      {
        id: "duoc_su_ch1",
        title: "12 Đại Nguyện Của Đức Dược Sư Lưu Ly Quang Phật",
        subTitle: "Ánh Sáng Trong Suốt Chiếu Sáng Khắp Vạn Loại",
        verses: [
          "Nguyện thứ nhất: Khi Ta thành Phật, thân tỏa ánh hào quang sáng rực chiếu khắp vô lượng cõi nước, khiến mọi chúng sinh đều có tướng tốt như Ta.",
          "Nguyện thứ hai: Thân Ta như ngọc lưu ly, trong ngoài sáng suốt thanh tịnh, phá tan mọi tăm tối u mê của chúng sinh.",
          "Nguyện thứ ba: Đem trí tuệ vô biên phương tiện vô lượng, khiến chúng sinh đầy đủ vật dụng ấm no không thiếu thốn.",
          "Nguyện thứ tư: Nếu chúng sinh đi theo tà đạo, Ta khiến họ quay về an trụ nơi con đường Bồ Đề chánh giác.",
          "Nguyện thứ năm: Nếu có ai tu trì phạm hạnh, Ta khiến họ giữ giới trọn vẹn, dẫu lỡ phạm giới nghe danh Ta liền được thanh tịnh.",
          "Nguyện thứ sáu: Chúng sinh thân thể tàn tật, đui mù ngọng câm xú xí, nghe danh Ta liền được thân thể vẹn toàn đoan trang.",
          "Nguyện thứ bảy: Chúng sinh nghèo cùng bệnh tật không người cứu chữa, nghe danh Ta liền dứt hết bệnh khổ, thân tâm an lạc gia quyến sum vầy.",
          "Nguyện thứ tám: Người chịu thân nữ hèn yếu muốn chuyển thân nam, nghe danh Ta liền chuyển được như ý nguyện.",
          "Nguyện thứ chín: Thoát khỏi lưới ma tà kiến, tinh tấn tu hành chánh đạo.",
          "Nguyện thứ mười: Chúng sinh bị pháp luật giam cầm tù tội xiềng xích, nghe danh Ta liền được giải thoát mọi tai ương.",
          "Nguyện thứ mười một: Kẻ đói khát vì tìm ăn mà tạo ác nghiệp, Ta cho ăn uống no đủ rồi đem vị pháp mầu khiến họ hưởng niềm vui tịch tịnh.",
          "Nguyện thứ mười hai: Kẻ rách rưới lạnh lẽo bị ruồi muỗi cắn đốt, Ta ban áo mặc gấm vóc quý giá, tràng hoa và âm nhạc vi diệu."
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 7. KINH VU LAN BÁO HIẾU (ĐẠO LÀM CON BÁO ÂN PHỤ MẪU)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_vu_lan",
    title: "Kinh Vu Lan Báo Hiếu",
    sanskritTitle: "Ullambana Sūtra — Vu Lan Bồn Kinh",
    category: "filial_piety",
    categoryLabel: "Kinh Đạo Hiếu",
    icon: "🕯️",
    coverColor: "rgba(231, 76, 60, 0.25)",
    readingMinutes: 7,
    description: "Bộ kinh thiêng liêng về tình mẫu tử và đạo hiếu hạnh, khởi nguồn từ câu chuyện Tôn giả Mục Kiền Liên vận thần thông cứu mẹ khỏi chốn ngạ quỷ trầm luân.",
    meritExplanation: "Tụng đọc Kinh Vu Lan nhắc nhở công ơn sinh thành dưỡng dục trời biển của cha mẹ, hồi hướng công đức giúp cửu huyền thất tổ siêu sanh, cha mẹ hiện tiền tăng long phước thọ.",
    chapters: [
      {
        id: "vu_lan_ch1",
        title: "Tấm Lòng Hiếu Đạo Của Tôn Giả Mục Kiền Liên",
        subTitle: "Mẹ Ơi Bát Cơm Đầy Nước Mắt",
        verses: [
          "Một thuở nọ Đức Thế Tôn an ngự, tại Kỳ Viên tịnh xá nước Xá Vệ.",
          "Đại đồ đệ Mục Kiền Liên Tôn giả, chứng thần thông sáu phép nhiệm mầu,",
          "Muốn báo đáp ân sâu dưỡng dục, của mẹ cha sinh nở nhọc nhằn.",
          "Dùng mắt huệ nhìn xem cõi thế, thấy mẹ hiền rớt chốn ngạ quỷ than van.",
          "Thân đói khát chỉ còn da bọc xương, không cơm ăn nước uống bao ngày.",
          "Ngài Mục Kiền Liên xót xa rơi lệ, bưng bát cơm dâng mẹ nghẹn ngào.",
          "Mẹ mừng rỡ tay che tay vội bốc, sợ người tranh cướp mất phần ăn.",
          "Nhưng hỡi ôi cơm vừa đưa tới miệng, lửa đỏ rực hóa thành than hồng chẳng thể nuốt!",
          "Tôn giả Mục Kiền Liên gào khóc thảm thiết, trở về bạch Đức Thế Tôn chỉ lối cứu nguy."
        ]
      },
      {
        id: "vu_lan_ch2",
        title: "Phương Pháp Cứu Mẹ & Ngày Vu Lan Thắng Hội",
        subTitle: "Nhờ Sức Chú Nguyện Mười Phương Tăng Già",
        verses: [
          "Đức Phật bảo Mục Kiền Liên thương khóc:",
          "Nghiệp mẹ ông sâu dày chướng nặng, một mình ông chẳng thể cứu nguy.",
          "Dẫu lòng hiếu thấu trời xanh mây trắng, thần thông ông cũng chịu bó tay.",
          "Phải nhờ sức mười phương Tăng chúng, ngày Rằm tháng Bảy Tự Tứ viên thành,",
          "Sắm trai soạn trăm món thanh tịnh, dâng cúng dường chư Phật mười phương.",
          "Nhờ định lực chú nguyện thanh tịnh của Tăng đoàn, mẹ ông liền thoát khỏi kiếp ngạ quỷ trầm luân.",
          "Mục Kiền Liên làm y lời Phật dạy, mẹ của ngài liền được sinh lên cõi trời an vui.",
          "Từ thuở ấy ngày rằm tháng Bảy, thành ngày lễ Vu Lan ngàn thuở rạng ngời hiếu ân!"
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 8. KINH DIỆU PHÁP LIÊN HOA (KINH PHÁP HOA - TUYỂN PHẨM)
  // ─────────────────────────────────────────────────────────────
  {
    id: "kinh_phap_hoa",
    title: "Kinh Diệu Pháp Liên Hoa (Pháp Hoa)",
    sanskritTitle: "Saddharma Puṇḍarīka Sūtra",
    category: "wisdom",
    categoryLabel: "Vua Các Bộ Kinh",
    icon: "🪷",
    coverColor: "rgba(233, 30, 99, 0.25)",
    readingMinutes: 9,
    description: "Được mệnh danh là Vua của các bộ kinh, hiển thị giáo lý Nhất Thừa tối thượng: tất cả chúng sinh đều sẵn có Phật tánh và đều sẽ thành Phật trọn vẹn.",
    meritExplanation: "Chỉ một niệm hoan hỷ tán thán Kinh Pháp Hoa, phước đức đã vô lượng vô biên, tâm trí bừng sáng niềm tin chắc thật vào khả năng giác ngộ của chính mình.",
    chapters: [
      {
        id: "phap_hoa_phuong_tien",
        title: "Phẩm Phương Tiện: Khai Thị Ngộ Nhập Phật Tri Kiến",
        subTitle: "Chư Phật Ra Đời Vì Một Đại Sự Nhân Duyên",
        verses: [
          "Lúc bấy giờ Đức Thế Tôn từ trong chánh định an nhiên đứng dậy, bảo Tôn giả Xá Lợi Phất:",
          "Trí tuệ của chư Phật vô cùng sâu xa, khó hiểu khó vào, tất cả hàng Thanh văn và Duyên giác đều không thấu triệt.",
          "Này Xá Lợi Phất! Chư Phật Thế Tôn chỉ vì một việc đại sự nhân duyên duy nhất mà xuất hiện nơi cõi đời.",
          "Đó là vì muốn cho chúng sinh Khai mở Phật tri kiến thanh tịnh mà xuất hiện nơi cõi đời;",
          "Vì muốn Chỉ rõ Phật tri kiến cho chúng sinh mà xuất hiện nơi cõi đời;",
          "Vì muốn cho chúng sinh Tỏ ngộ Phật tri kiến mà xuất hiện nơi cõi đời;",
          "Vì muốn cho chúng sinh Đi vào con đường Phật tri kiến mà xuất hiện nơi cõi đời.",
          "Xá Lợi Phất! Trong mười phương thế giới, không có hai thừa, huống chi là có ba thừa!",
          "Tất cả đều hướng về một cỗ xe Phật thừa duy nhất đưa chúng sinh đến bến bờ giác ngộ."
        ]
      },
      {
        id: "phap_hoa_thi_du",
        title: "Phẩm Thí Dụ: Ba Cỗ Xe Ra Khỏi Nhà Lửa",
        subTitle: "Từ Bỏ Ngôi Nhà Lửa Trần Gian Nhiễm Ô",
        verses: [
          "Ba cõi bất an như ngôi nhà lửa cháy, ngập tràn các nỗi khốn đốn lo âu đớn đau.",
          "Chúng sinh đắm chìm trong thú vui si mê ngắn ngủi, không hay biết lửa đang thiêu đốt thân mình.",
          "Người cha từ bi vì thương xót đàn con thơ ngây dại,",
          "Bèn dùng phương tiện khéo bảo rằng: Bên ngoài có xe dê, xe hươu, xe trâu tốt đẹp!",
          "Các con nghe thấy đua nhau chạy thoát ra ngoài khoảng đất trống mát mẻ an lành.",
          "Khi các con đã an toàn thoát khỏi đám cháy dữ,",
          "Người cha bình đẳng ban cho mỗi người con một cỗ xe Đại Bạch Ngưu lộng lẫy bằng vàng ngọc báu vật!",
          "Như Lai cũng vậy, dùng các phương tiện dẫn dắt chúng sinh ra khỏi tam giới,",
          "Rồi trao cho tất cả cỗ xe Phật thừa tối thượng vô song!"
        ]
      }
    ]
  }
];

/**
 * Trình phát Audio Kinh Phật (Sutra Audio Engine)
 * Kết hợp Web Speech API (Vietnamese Speech Synthesis) và Web Audio Bell Chimes
 */
export class SutraAudioEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentSutra: Sutra | null = null;
  private currentChapterIdx: number = 0;
  private currentVerseIdx: number = 0;
  private playbackRate: number = 0.95; // Nhịp đọc thư thái thanh tịnh
  private pitch: number = 1.0;
  private vietnameseVoice: SpeechSynthesisVoice | null = null;
  private autoAdvanceTimer: number | null = null;
  private enableChime: boolean = true;

  // Listeners thông báo cho UI
  public onStateChange: ((state: {
    isPlaying: boolean;
    isPaused: boolean;
    sutra: Sutra | null;
    chapterIdx: number;
    verseIdx: number;
    totalVerses: number;
    currentText: string;
  }) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Ưu tiên các giọng tiếng Việt tự nhiên truyền cảm
    const viVoice = voices.find(
      (v) =>
        v.lang === "vi-VN" ||
        v.lang.startsWith("vi") ||
        v.name.toLowerCase().includes("vietnam") ||
        v.name.toLowerCase().includes("vietnamese")
    );
    if (viVoice) {
      this.vietnameseVoice = viVoice;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getCurrentSutra(): Sutra | null {
    return this.currentSutra;
  }

  public getCurrentChapterIndex(): number {
    return this.currentChapterIdx;
  }

  public getCurrentVerseIndex(): number {
    return this.currentVerseIdx;
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.6, Math.min(1.5, rate));
    if (this.isPlaying && !this.isPaused) {
      // Re-read current verse at new rate
      this.readCurrentVerse();
    }
  }

  public toggleChime(enabled?: boolean) {
    this.enableChime = enabled !== undefined ? enabled : !this.enableChime;
    return this.enableChime;
  }

  public playSutra(sutra: Sutra, chapterIdx = 0, verseIdx = 0) {
    if (!this.synth) return;

    this.currentSutra = sutra;
    this.currentChapterIdx = Math.max(0, Math.min(sutra.chapters.length - 1, chapterIdx));
    this.currentVerseIdx = Math.max(0, Math.min(sutra.chapters[this.currentChapterIdx].verses.length - 1, verseIdx));

    this.isPlaying = true;
    this.isPaused = false;

    // Thỉnh tiếng chuông bát nhã mở đầu phẩm kinh
    if (this.enableChime) {
      zenAudio.playSingingBowl(528); // Tần số 528Hz an hòa
    }

    setTimeout(() => {
      this.readCurrentVerse();
    }, 600);
  }

  public pause() {
    if (!this.synth || !this.isPlaying) return;
    this.isPaused = true;
    this.synth.cancel();
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.notifyState();
  }

  public resume() {
    if (!this.isPlaying || !this.currentSutra) return;
    this.isPaused = false;
    this.readCurrentVerse();
  }

  public stop() {
    if (!this.synth) return;
    this.isPlaying = false;
    this.isPaused = false;
    this.synth.cancel();
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.notifyState();
  }

  public nextVerse() {
    if (!this.currentSutra) return;
    const chapter = this.currentSutra.chapters[this.currentChapterIdx];
    if (this.currentVerseIdx < chapter.verses.length - 1) {
      this.currentVerseIdx++;
      if (this.isPlaying && !this.isPaused) {
        this.readCurrentVerse();
      } else {
        this.notifyState();
      }
    } else if (this.currentChapterIdx < this.currentSutra.chapters.length - 1) {
      // Next chapter
      this.currentChapterIdx++;
      this.currentVerseIdx = 0;
      if (this.enableChime) zenAudio.playTempleBell(220);
      if (this.isPlaying && !this.isPaused) {
        this.readCurrentVerse();
      } else {
        this.notifyState();
      }
    }
  }

  public prevVerse() {
    if (!this.currentSutra) return;
    if (this.currentVerseIdx > 0) {
      this.currentVerseIdx--;
    } else if (this.currentChapterIdx > 0) {
      this.currentChapterIdx--;
      this.currentVerseIdx = this.currentSutra.chapters[this.currentChapterIdx].verses.length - 1;
    }
    if (this.isPlaying && !this.isPaused) {
      this.readCurrentVerse();
    } else {
      this.notifyState();
    }
  }

  public seekVerse(chapterIdx: number, verseIdx: number) {
    if (!this.currentSutra) return;
    this.currentChapterIdx = Math.max(0, Math.min(this.currentSutra.chapters.length - 1, chapterIdx));
    const chapter = this.currentSutra.chapters[this.currentChapterIdx];
    this.currentVerseIdx = Math.max(0, Math.min(chapter.verses.length - 1, verseIdx));

    if (this.isPlaying && !this.isPaused) {
      this.readCurrentVerse();
    } else {
      this.notifyState();
    }
  }

  private readCurrentVerse() {
    if (!this.synth || !this.currentSutra || !this.isPlaying || this.isPaused) return;

    this.synth.cancel();

    const chapter = this.currentSutra.chapters[this.currentChapterIdx];
    if (!chapter || !chapter.verses[this.currentVerseIdx]) return;

    const verseText = chapter.verses[this.currentVerseIdx];
    const utter = new SpeechSynthesisUtterance(verseText);
    utter.rate = this.playbackRate;
    utter.pitch = this.pitch;

    if (this.vietnameseVoice) {
      utter.voice = this.vietnameseVoice;
      utter.lang = this.vietnameseVoice.lang;
    } else {
      utter.lang = "vi-VN";
    }

    utter.onend = () => {
      // Khi đọc xong 1 câu, khẽ điểm tiếng mõ hoặc chuông thanh tịnh
      if (this.enableChime && this.currentVerseIdx % 3 === 0) {
        zenAudio.playWoodenFish(620);
      }

      // Tự động chuyển câu tiếp theo sau quãng nghỉ thiền 650ms
      this.autoAdvanceTimer = window.setTimeout(() => {
        if (!this.isPlaying || this.isPaused) return;

        const currentChapter = this.currentSutra!.chapters[this.currentChapterIdx];
        if (this.currentVerseIdx < currentChapter.verses.length - 1) {
          this.currentVerseIdx++;
          this.readCurrentVerse();
        } else if (this.currentChapterIdx < this.currentSutra!.chapters.length - 1) {
          // Sang chương tiếp theo
          this.currentChapterIdx++;
          this.currentVerseIdx = 0;
          if (this.enableChime) zenAudio.playTempleBell(220);
          this.readCurrentVerse();
        } else {
          // Đã hoàn thành toàn bộ bài kinh! Thỉnh đại hồng chung tán thán công đức!
          this.isPlaying = false;
          if (this.enableChime) zenAudio.playTempleBell(196);
          this.notifyState();
        }
      }, 700);
    };

    utter.onerror = (e) => {
      console.warn("SutraAudioEngine TTS error/cancelled:", e);
    };

    this.currentUtterance = utter;
    this.synth.speak(utter);
    this.notifyState();
  }

  private notifyState() {
    if (!this.onStateChange) return;

    const chapter = this.currentSutra?.chapters[this.currentChapterIdx];
    const totalVerses = chapter ? chapter.verses.length : 0;
    const currentText = chapter && chapter.verses[this.currentVerseIdx] ? chapter.verses[this.currentVerseIdx] : "";

    this.onStateChange({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      sutra: this.currentSutra,
      chapterIdx: this.currentChapterIdx,
      verseIdx: this.currentVerseIdx,
      totalVerses,
      currentText
    });
  }
}

export const sutraAudio = new SutraAudioEngine();
