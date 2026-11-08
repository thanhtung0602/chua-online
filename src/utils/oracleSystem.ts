/**
 * oracleSystem.ts - Hệ Thống Xin Quẻ Đa Nguyện Ước Chùa An Lạc
 * 
 * Hỗ trợ các danh mục quẻ xăm truyền thống Phật giáo & dân gian:
 * 1. 🌸 Nhân Duyên & Tình Cảm (Cầu duyên, gia đạo, hòa hợp, tri kỷ)
 * 2. 📚 Học Hành & Thi Cử (Đỗ đạt, khoa cử, trí tuệ Bát Nhã, khai sáng)
 * 3. 💼 Công Danh & Sự Nghiệp (Kinh doanh, thăng tiến, buôn bán, tài lộc)
 * 4. 🌿 Sức Khỏe & Bình An (Tiêu tai diệt bệnh, thân tâm an lạc, trường thọ)
 * 5. 📜 Lời Phật Dạy (Kinh Pháp Cú - Dhammapada soi sáng tâm hồn)
 */

export type OracleCategory = "love" | "study" | "career" | "peace" | "dhammapada";

export type FortuneRank = "Đại Cát" | "Thượng Thượng" | "Thượng Cát" | "Trung Cát";

export interface OracleStick {
  id: number;
  category: OracleCategory;
  categoryName: string;
  rank: FortuneRank;
  title: string;
  poem: string;
  interpretation: string;
  advice: string;
  pali?: string;
}

export interface OracleCategoryMeta {
  id: OracleCategory;
  name: string;
  icon: string;
  tubeText: string;
  prayerPrompt: string;
  badgeClass: string;
}

export const ORACLE_CATEGORIES: OracleCategoryMeta[] = [
  {
    id: "love",
    name: "Nhân Duyên",
    icon: "🌸",
    tubeText: "NHÂN DUYÊN",
    prayerPrompt: "Chắp tay thành kính nguyện cầu nhân duyên hòa hợp, tri kỷ tương phùng, thiện duyên kết trái lành...",
    badgeClass: "badge-love"
  },
  {
    id: "study",
    name: "Học Hành",
    icon: "📚",
    tubeText: "HỌC HÀNH",
    prayerPrompt: "Lắng lòng định tĩnh, cầu nguyện Văn Thù Sư Lợi Bồ Tát khai mở trí tuệ, thi cử hanh thông, bảng vàng đề danh...",
    badgeClass: "badge-study"
  },
  {
    id: "career",
    name: "Sự Nghiệp",
    icon: "💼",
    tubeText: "SỰ NGHIỆP",
    prayerPrompt: "Nguyện cầu vạn sự hanh thông, quý nhân phù trợ, kinh doanh phát đạt, chánh mạng viên thành...",
    badgeClass: "badge-career"
  },
  {
    id: "peace",
    name: "Bình An",
    icon: "🌿",
    tubeText: "BÌNH AN",
    prayerPrompt: "Thành tâm cầu nguyện Dược Sư Lưu Ly Quang Phật tiêu trừ tai ương, thân tâm khang kiện, gia đạo an khang...",
    badgeClass: "badge-peace"
  },
  {
    id: "dhammapada",
    name: "Pháp Cú",
    icon: "📜",
    tubeText: "PHÁP CÚ",
    prayerPrompt: "Lắng lòng thanh tịnh, chắp tay thành kính nguyện cầu lời vàng Phật dạy soi sáng tâm hồn...",
    badgeClass: "badge-dhammapada"
  }
];

export const ALL_ORACLE_STICKS: OracleStick[] = [
  // ==========================================
  // 1. NHÂN DUYÊN & TÌNH CẢM (🌸 LOVE)
  // ==========================================
  {
    id: 101,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Thượng Thượng",
    title: "Quẻ Số 1: Hạnh Ngộ Duyên Lành",
    poem: "Hồng trần vạn dặm ngỡ xa xôi,\nHữu duyên thiên lý ắt chung đôi.\nTâm thành thấu suốt trăng thu tỏ,\nHoa thắm đầu cành kết trái vui.",
    interpretation: "Duyên lành đã cận kề. Người có tâm ý hướng thiện, biết lắng nghe và thấu hiểu sẽ sớm gặp được người đồng hành tri kỷ. Tình cảm đôi lứa nảy nở tự nhiên dựa trên nền tảng tôn trọng và chân thành.",
    advice: "Duyên đến hãy trân trọng, dùng ái ngữ và sự bao dung để vun đắp. Đừng nóng vội, hãy để đóa hoa tình cảm nở rộ tự nhiên như hương sen mùa hạ."
  },
  {
    id: 102,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Thượng Cát",
    title: "Quẻ Số 2: Nhường Nhịn Giữ Duyên",
    poem: "Gió thoảng qua rèm chớ vội lay,\nNhân duyên thử thách chút mưa bay.\nMột lời nhường nhịn an hòa khí,\nHạnh phúc trăm năm vững tháng ngày.",
    interpretation: "Trong mối quan hệ có đôi chút bất đồng ý kiến hoặc hiểu lầm nho nhỏ. Đây chỉ là thử thách để đôi bên hiểu nhau sâu sắc hơn. Giữ tâm điềm tĩnh, tránh tranh cãi hơn thua.",
    advice: "Thực tập hạnh lắng nghe sâu của Bồ Tát Quán Thế Âm. Khi nóng giận không vội buông lời cay đắng; đợi tâm lắng dịu rồi cùng sẻ chia chân tình."
  },
  {
    id: 103,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Đại Cát",
    title: "Quẻ Số 3: Gắn Kết Tri Âm",
    poem: "Cung đàn tri kỷ tấu thanh âm,\nĐồng điệu tâm linh ý hợp thầm.\nTay nắm bàn tay cùng bước tới,\nSen hồng ngát tỏa giữa đài tâm.",
    interpretation: "Báo hiệu một cuộc hạnh ngộ đẹp đẽ với người hiểu bạn từ ánh mắt nụ cười. Mối lương duyên này có sự giao thoa sâu sắc về lý tưởng sống và tâm hồn thánh thiện.",
    advice: "Trân trọng từng phút giây hiện tại bên người thương. Cùng nhau gieo hạt giống thiện lành, đi chùa lễ Phật để bồi đắp phước duyên bền lâu."
  },
  {
    id: 104,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Thượng Cát",
    title: "Quẻ Số 4: Tùy Duyên Tự Tại",
    poem: "Xuân đến hoa khai tỏa ngát hương,\nTùy duyên không cưỡng vạn nẻo đường.\nThanh thản mây trôi trời cao rộng,\nHạnh phúc tìm về chốn tịnh phương.",
    interpretation: "Tình cảm không thể cưỡng cầu hay ép buộc. Khi bạn biết trân quý bản thân, sống lương thiện và tỏa ra năng lượng an lành, tự khắc người xứng đáng sẽ bước vào cuộc đời bạn.",
    advice: "Buông bỏ lo âu 'bao giờ có người yêu'. Hãy chăm sóc thân tâm cho thật an vui, hoa nở thơm ngát ắt ong bướm tự tìm đến."
  },
  {
    id: 105,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Thượng Cát",
    title: "Quẻ Số 5: Gương Vỡ Lại Lành",
    poem: "Mây tan trăng sáng rạng non đoài,\nHiểu lầm hóa giải bóng tối phai.\nBao dung gội rửa niềm đau cũ,\nNắng ấm bừng lên nối tương lai.",
    interpretation: "Những gút mắc trong quá khứ hoặc khoảng cách với người thương sắp được tháo gỡ. Cơ hội hàn gắn mở ra nếu cả hai bên biết đặt cái Tôi xuống và trao nhau sự tha thứ.",
    advice: "Chủ động nhắn gửi một lời hỏi thăm chân thành. Lòng vị tha và nụ cười bao dung chính là chìa khóa mở toang mọi cánh cửa ngăn cách."
  },
  {
    id: 106,
    category: "love",
    categoryName: "Nhân Duyên",
    rank: "Đại Cát",
    title: "Quẻ Số 6: Gia Đạo Viên Mãn",
    poem: "Mái ấm bình yên rộn tiếng cười,\nVợ chồng hòa thuận sắc thắm tươi.\nHiếu kính tổ tiên phước đức dặm,\nCon thảo cháu hiền rạng nụ cười.",
    interpretation: "Gia đạo yên vui, vợ chồng thuận hòa, trên kính dưới nhường. Tình duyên đơm hoa kết trái ngọt ngào, đón nhận nhiều tin vui mừng rỡ từ người thân.",
    advice: "Dành thời gian ăn bữa cơm ấm cúng bên gia đình, trân trọng hạnh phúc bình dị nơi mái ấm thân thương."
  },

  // ==========================================
  // 2. HỌC HÀNH & THI CỬ (📚 STUDY)
  // ==========================================
  {
    id: 201,
    category: "study",
    categoryName: "Học Hành",
    rank: "Đại Cát",
    title: "Quẻ Số 1: Bảng Vàng Đề Danh",
    poem: "Mài sắt có ngày nên kim tinh,\nĐèn sách chuyên tâm rạng ánh bình.\nKỳ thi sắp tới danh vang khắp,\nBảng vàng đề chữ thỏa chí mình.",
    interpretation: "Công phu rèn luyện miệt mài bấy lâu nay sắp đến ngày gặt hái quả ngọt. Trí tuệ sáng suốt, bước vào phòng thi tâm lý vững vàng, làm bài hanh thông, kết quả vượt ngoài mong đợi.",
    advice: "Giữ nhịp ôn tập đều đặn, ăn ngủ đúng giờ, tránh thức quá khuya. Thắp một nén tâm hương cầu nguyện Văn Thù Bồ Tát gia hộ trí tuệ minh mẫn."
  },
  {
    id: 202,
    category: "study",
    categoryName: "Học Hành",
    rank: "Thượng Cát",
    title: "Quẻ Số 2: Cẩn Trọng Vững Tâm",
    poem: "Nước sâu chảy chậm ý chớ khinh,\nLàm bài cẩn thận chớ xem thường.\nTừng câu từng chữ suy cho kỹ,\nThành công ắt nắm trọn trong tay.",
    interpretation: "Kiến thức của bạn rất vững vàng, nhưng cần đặc biệt lưu ý tính cẩn trọng. Tránh chủ quan đọc lướt đề bài. Tĩnh tâm làm từng bước ắt giành điểm tuyệt đối.",
    advice: "Thực tập hít thở sâu 3 hơi trước khi đặt bút làm bài thi. Kiểm tra lại bài làm kỹ lưỡng trước khi nộp."
  },
  {
    id: 203,
    category: "study",
    categoryName: "Học Hành",
    rank: "Thượng Cát",
    title: "Quẻ Số 3: Quý Nhân Chỉ Điểm",
    poem: "Đường học thênh thang gặp bạn hiền,\nThầy cô dẫn lối mở căn duyên.\nChỗ khó bấy lâu nay bừng sáng,\nVăn chương thao lược vững hoa niên.",
    interpretation: "Trong việc học tập và nghiên cứu sẽ gặp được thầy giỏi bạn tốt chỉ đường dẫn lối. Những bài toán hóc búa hay đề tài bế tắc sẽ tìm ra hướng giải quyết xuất sắc.",
    advice: "Luôn giữ lòng tôn sư trọng đạo, khiêm tốn hỏi han bạn bè. Tinh thần học hỏi không ngừng sẽ mở toang kho tàng tri thức."
  },
  {
    id: 204,
    category: "study",
    categoryName: "Học Hành",
    rank: "Trung Cát",
    title: "Quẻ Số 4: Vượt Qua Áp Lực",
    poem: "Núi cao ắt có lối mòn lên,\nÁp lực chông gai chớ ngả nghiêng.\nTâm tĩnh trí thông bừng khai mở,\nVượt qua thử thách thỏa lòng bền.",
    interpretation: "Bạn đang chịu nhiều áp lực về thời gian, điểm số hoặc sự kỳ vọng từ gia đình. Hãy nhớ rằng áp lực tạo nên kim cương. Thử thách này giúp rèn luyện bản lĩnh vượt bậc.",
    advice: "Dành 10 phút ngồi thiền hoặc đi dạo hít thở khí trời trong lành. Tâm an tịnh thì trí tuệ mới thông suốt."
  },
  {
    id: 205,
    category: "study",
    categoryName: "Học Hành",
    rank: "Đại Cát",
    title: "Quẻ Số 5: Khai Hoa Trí Tuệ",
    poem: "Đóa hoa Bát Nhã ngát trong tâm,\nHọc một biết mười sáng diệu thầm.\nNghiên cứu sáng tạo đều thấu suốt,\nTương lai xán lạn tựa trăng rằm.",
    interpretation: "Thời vận học vấn đang lúc hanh thông cực thịnh. Tư duy mạch lạc, khả năng tiếp thu và sáng tạo vượt trội. Rất thích hợp cho thi cử, bảo vệ luận văn hoặc học kỹ năng mới.",
    advice: "Dùng sự hiểu biết của mình giúp đỡ bạn bè cùng tiến bộ, phước trí trang nghiêm thì thành công càng bền vững."
  },
  {
    id: 206,
    category: "study",
    categoryName: "Học Hành",
    rank: "Thượng Cát",
    title: "Quẻ Số 6: Khởi Đầu Thuận Lợi",
    poem: "Mở trang sách mới đón ban mai,\nVạn dặm đường xa bước dặm dài.\nVững bước kiên trì không nản chí,\nTương lai rực rỡ đón nhân tài.",
    interpretation: "Khởi đầu một khóa học mới, ngành học mới hoặc dự án học thuật mới rất suôn sẻ. Nền tảng được xây dựng vững chắc sẽ là bệ phóng cho tương lai xán lạn.",
    advice: "Lập thời gian biểu học tập khoa học. Mỗi ngày tích lũy một chút như giọt nước nhỏ lâu ngày đầy lu."
  },

  // ==========================================
  // 3. CÔNG DANH & SỰ NGHIỆP (💼 CAREER)
  // ==========================================
  {
    id: 301,
    category: "career",
    categoryName: "Sự Nghiệp",
    rank: "Đại Cát",
    title: "Quẻ Số 1: Thời Cơ Chín Muồi",
    poem: "Cánh buồm đón gió vượt trùng khơi,\nVận thế hanh thông rạng góc trời.\nMở lối kinh doanh tài lộc tụ,\nCông danh hiển hách thỏa lòng người.",
    interpretation: "Cơ hội thăng tiến, chuyển việc hoặc mở rộng kinh doanh đang mở ra trước mắt. Có quý nhân tương trợ, công việc thuận buồm xuôi gió, tài chính khởi sắc dồi dào.",
    advice: "Nhanh chóng nắm bắt thời cơ nhưng luôn giữ chữ Tín và làm ăn chân chính (Chánh Mạng). Lộc đến nhớ trích phần làm từ thiện cứu giúp người khó khăn."
  },
  {
    id: 302,
    category: "career",
    categoryName: "Sự Nghiệp",
    rank: "Thượng Cát",
    title: "Quẻ Số 2: Tích Lũy Nội Lực",
    poem: "Tre xanh giấu gốc đợi mùa mưa,\nChờ đợi thời cơ chớ vội bừa.\nBền chí luyện rèn tài đức đủ,\nBung chồi vươn ngọn tựa ngàn xưa.",
    interpretation: "Giai đoạn này thích hợp cho việc củng cố nội lực, học hỏi kinh nghiệm và xây dựng niềm tin với cấp trên, đồng nghiệp hơn là mạo hiểm đầu tư lớn.",
    advice: "Kiên nhẫn là chìa khóa vàng. Làm tốt việc nhỏ hiện tại, thành công lớn tự khắc gõ cửa khi thời điểm chín muồi."
  },
  {
    id: 303,
    category: "career",
    categoryName: "Sự Nghiệp",
    rank: "Thượng Cát",
    title: "Quẻ Số 3: Hóa Giải Khó Khăn",
    poem: "Qua cơn mưa tối nắng bừng soi,\nKhúc mắc gian nan xóa sạch rồi.\nĐồng nghiệp tin yêu sếp trọng dụng,\nSự nghiệp thênh thang bước thảnh thơi.",
    interpretation: "Những áp lực, hiểu lầm hoặc trục trặc trong công việc thời gian qua sắp tiêu tan. Công sức cống hiến bền bỉ của bạn được cấp trên ghi nhận và đền đáp xứng đáng.",
    advice: "Giữ tinh thần dĩ hòa vi quý. Lời nói thẳng thắn nhưng mang tính xây dựng và hòa ái sẽ thu phục lòng người."
  },
  {
    id: 304,
    category: "career",
    categoryName: "Sự Nghiệp",
    rank: "Đại Cát",
    title: "Quẻ Số 4: Tài Lộc Tự Tụ",
    poem: "Nước chảy về trũng của vào kho,\nThiện tâm gieo phước hết âu lo.\nGiao dịch hanh thông lời gấp bội,\nBình an phú quý phúc trời cho.",
    interpretation: "Tài chính khởi sắc rực rỡ, các hợp đồng hoặc dự án kinh doanh đều mang lại lợi nhuận tốt đẹp. Tiền bạc hanh thông, công việc buôn bán tấp nập khách hàng.",
    advice: "Càng phát tài càng nên giữ tâm khiêm cung và giản dị. Đồng tiền làm ra bằng mồ hôi và lòng lương thiện sẽ bền vững muôn đời."
  },
  {
    id: 305,
    category: "career",
    categoryName: "Sự Nghiệp",
    rank: "Thượng Cát",
    title: "Quẻ Số 5: Khởi Nghiệp Bền Vững",
    poem: "Tự tay gầy dựng nghiệp mai sau,\nKhó nhọc ban đầu chớ ngại ngâu.\nÝ chí kiên cường tâm kiên định,\nCông thành danh toại rạng nghìn câu.",
    interpretation: "Dự án mới hoặc con đường tự lập khởi nghiệp của bạn có triển vọng rất xán lạn. Giai đoạn đầu tuy có vất vả nhưng nền tảng đạo đức vững vàng sẽ giúp bạn đi xa.",
    advice: "Đặt cái Tâm phụng sự khách hàng lên hàng đầu. Uy tín chính là tài sản vô giá của người làm kinh doanh."
  },

  // ==========================================
  // 4. SỨC KHỎE & BÌNH AN (🌿 PEACE)
  // ==========================================
  {
    id: 401,
    category: "peace",
    categoryName: "Bình An",
    rank: "Đại Cát",
    title: "Quẻ Số 1: Thân An Tâm Lạc",
    poem: "Thân như cây bách đón sương mai,\nKhí sắc tươi nhuận dặm đường dài.\nTâm trí thảnh thơi không vướng bận,\nTai ương tiêu tán phúc lâu dài.",
    interpretation: "Sức khỏe dồi dào, thân thể tráng kiện, bệnh tật tiêu trừ. Tinh thần sảng khoái và tràn đầy năng lượng tích cực. Gia quyến bình an, không có điều gì phải âu lo.",
    advice: "Duy trì nếp sống điều độ, ăn uống thanh đạm, mỗi sáng dành 15 phút tập thở hoặc đi bộ để dưỡng sinh."
  },
  {
    id: 402,
    category: "peace",
    categoryName: "Bình An",
    rank: "Thượng Cát",
    title: "Quẻ Số 2: Giải Tỏa Phiền Não",
    poem: "Gánh nặng bao năm hãy đặt xuôi,\nLo toan buông bỏ miệng tươi cười.\nUống chén trà thơm lòng lắng lại,\nBình an tự tại giữa đất trời.",
    interpretation: "Bệnh tật phần lớn sinh ra từ việc suy nghĩ quá nhiều và lo âu tích tụ. Khi buông bỏ được những phiền toái trong tâm, cơ thể sẽ tự khắc hồi phục diệu kỳ.",
    advice: "Tập buông xả trước giờ ngủ. Uống một ngụm nước ấm, hít thở sâu và cảm ơn thân thể đã cùng ta đồng hành suốt một ngày dài."
  },
  {
    id: 403,
    category: "peace",
    categoryName: "Bình An",
    rank: "Thượng Cát",
    title: "Quẻ Số 3: Tai Qua Nạn Khỏi",
    poem: "Bồ Tát Quan Âm rưới nước lành,\nCành dương cam lộ tẩy trần thanh.\nHạn ách tiêu trừ may mắn đến,\nSống vui khỏe mạnh hưởng an lành.",
    interpretation: "Điềm lành tai qua nạn khỏi, gặp thầy gặp thuốc, người đau ốm mau chóng bình phục. Khó khăn trở ngại sắp lùi xa, nhường chỗ cho bình an và niềm vui.",
    advice: "Thường xuyên niệm danh hiệu Dược Sư Lưu Ly Quang Phật hoặc Quán Thế Âm Bồ Tát. Phóng sinh chim cá hồi hướng công đức sức khỏe."
  },
  {
    id: 404,
    category: "peace",
    categoryName: "Bình An",
    rank: "Đại Cát",
    title: "Quẻ Số 4: Trẻ Mãi Tâm Hồn",
    poem: "Tâm sáng trăng thu chẳng bợn nhơ,\nThảnh thơi dạo bước cõi sương mờ.\nKhông màng danh lợi lòng thanh thản,\nBách niên giai lão thắm đường tơ.",
    interpretation: "Quẻ cát tường báo hiệu sự trường thọ, gia đình êm ấm, nhiều phước lộc. Tâm hồn trẻ trung, lạc quan giúp bạn luôn rạng rỡ và truyền cảm hứng an lành cho người xung quanh.",
    advice: "Sống thuận theo tự nhiên, giữ nụ cười trên môi mỗi ngày chính là liều thuốc dưỡng nhan và trường thọ quý báu nhất."
  },

  // ==========================================
  // 5. KINH PHÁP CÚ (📜 DHAMMAPADA)
  // ==========================================
  {
    id: 501,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Đại Cát",
    title: "Quẻ Số 1: Ý Dẫn Đầu Các Pháp",
    pali: "Manopubbaṅgamā dhammā...",
    poem: "Ý dẫn đầu các pháp,\nÝ làm chủ, ý tạo;\nNếu với ý thanh tịnh,\nNói lên hay hành động,\nAn lạc bước theo sau,\nNhư bóng không rời hình.",
    interpretation: "Tâm ý là cội nguồn của mọi hạnh phúc và an vui. Khi tâm niệm hướng thiện và trong sạch, an lành tự khắc hiện hữu.",
    advice: "Hôm nay hãy giữ tâm ý tĩnh lặng, mỉm cười với mọi người và nói lời hòa ái bao dung."
  },
  {
    id: 502,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Thượng Thượng",
    title: "Quẻ Số 2: Oán Diệt Bằng Tình Thương",
    pali: "Na hi verena verāni...",
    poem: "Hận thù diệt hận thù,\nĐời này không thể có;\nTừ bi diệt hận thù,\nLà định luật ngàn thu.",
    interpretation: "Không thể dùng giận dữ để dập tắt oán hờn. Chỉ có sự thấu hiểu và lòng từ bi mới hóa giải được mọi trắc trở oan gia.",
    advice: "Buông xả những bất như ý. Tha thứ cho người khác cũng chính là tự cởi trói và giải thoát cho chính mình."
  },
  {
    id: 503,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Đại Cát",
    title: "Quẻ Số 3: Chiến Thắng Vĩ Đại",
    pali: "Yo sahassaṁ sahassena...",
    poem: "Dù tại bãi chiến trường,\nThắng ngàn vạn quân địch;\nKhông bằng tự thắng mình,\nChiến công ấy quang vinh.",
    interpretation: "Chiến thắng vĩ đại nhất của đời người là làm chủ được cơn giận, lòng tham và sự nóng nảy của bản thân.",
    advice: "Hôm nay hãy thực tập dừng lại một phút tĩnh tâm trước khi đưa ra phản ứng hay quyết định quan trọng."
  },
  {
    id: 504,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Thượng Cát",
    title: "Quẻ Số 4: Tự Mình Là Ngọn Đèn",
    pali: "Attā hi attano nātho...",
    poem: "Tự mình nương tựa mình,\nNào nương tựa ai khác?\nKhi tự mình khéo tu,\nTìm được nơi nương náu.",
    interpretation: "Bình yên thật sự không đến từ ngoại cảnh hay người khác, mà được thắp sáng từ nội tâm vững chãi của chính bạn.",
    advice: "Hãy quay về nương tựa hơi thở, tin tưởng vào hạt giống an lạc và thiện lành vốn có bên trong."
  },
  {
    id: 505,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Thượng Cát",
    title: "Quẻ Số 5: Nước Nhỏ Chảy Tràn Lu",
    pali: "Māvamaññetha puññassa...",
    poem: "Chớ khinh việc thiện nhỏ,\nCho rằng không phước gì;\nTừng giọt nước nhỏ tí,\nLâu ngày cũng đầy lu.",
    interpretation: "Mỗi hành động tử tế dù là nhỏ nhất, một lời động viên hay một nụ cười ấm áp, đều vun bồi phước báu vô lượng.",
    advice: "Hãy làm một việc tử tế nhỏ mà không cần ai biết đến trong ngày hôm nay."
  },
  {
    id: 506,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Thượng Cát",
    title: "Quẻ Số 6: Bền Vững Tựa Đá Tảng",
    pali: "Selo yathā ekaghano...",
    poem: "Như tảng đá kiên cố,\nKhông gió nào lay chuyển;\nCũng vậy trước khen chê,\nNgười trí chẳng đổi dời.",
    interpretation: "Tâm định tĩnh trước ngọn gió khen - chê, được - mất của thế gian là trạng thái an nhiên của bậc trí huệ.",
    advice: "Khi nghe lời khen hay tiếng chê, hãy giữ lòng nhẹ nhàng như cánh hoa rơi trên mặt nước hồ sen tĩnh tại."
  },
  {
    id: 507,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Đại Cát",
    title: "Quẻ Số 7: Hoa Thơm Ngược Gió",
    pali: "Na pupphagandho paṭivātameti...",
    poem: "Hương các loài hoa thơm,\nKhông bay ngược chiều gió;\nNhưng hương người đức hạnh,\nBay khắp cả mười phương.",
    interpretation: "Đức hạnh, lòng nhân ái và sự chân thành có sức lan tỏa vượt qua không gian, cảm hóa muôn loài.",
    advice: "Sống chân thành, giản dị và giữ tâm khiêm cung sẽ đem lại sự ấm áp cho những người xung quanh."
  },
  {
    id: 508,
    category: "dhammapada",
    categoryName: "Pháp Cú",
    rank: "Đại Cát",
    title: "Quẻ Số 8: Bình Yên Tột Cùng",
    pali: "Natthi santi paraṁ sukhaṁ...",
    poem: "Không có hạnh phúc nào,\nBằng tâm bình an lạc;\nBuông xả mọi chấp thủ,\nNhẹ gánh thảnh thơi bay.",
    interpretation: "Đỉnh cao của niềm vui thế gian cũng không sánh bằng sự thanh thản khi lòng rũ bỏ hết mọi bám chấp nặng trĩu.",
    advice: "Tập buông xuống những kỳ vọng quá mức, chấp nhận hiện thực với lòng biết ơn sâu sắc."
  }
];

/**
 * Lấy ngẫu nhiên quẻ theo danh mục lựa chọn
 */
export function getOracleStickByCategory(category: OracleCategory): OracleStick {
  const filtered = ALL_ORACLE_STICKS.filter((s) => s.category === category);
  if (filtered.length === 0) {
    return ALL_ORACLE_STICKS[0];
  }
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx];
}

/**
 * Lấy ngẫu nhiên quẻ trong toàn bộ kho tàng
 */
export function getRandomOracleStick(): OracleStick {
  const idx = Math.floor(Math.random() * ALL_ORACLE_STICKS.length);
  return ALL_ORACLE_STICKS[idx];
}
