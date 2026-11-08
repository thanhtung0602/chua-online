/**
 * zenQuotes.ts - Tuyển tập Lời Dạy Phật Pháp & Châm Ngôn Thiền Định An Lạc
 * Luân chuyển định kỳ trên thanh trạng thái giúp thanh lọc tâm hồn đạo hữu
 */

export const ZEN_QUOTES: string[] = [
  "Tâm an vạn sự an. Bình yên đến từ bên trong, đừng tìm kiếm ở bên ngoài.",
  "Thở vào tâm tĩnh lặng, thở ra miệng mỉm cười. An trú trong hiện tại, giờ phút đẹp tuyệt vời.",
  "Hận thù diệt hận thù, đời này không thể có. Từ bi diệt hận thù, là định luật ngàn thu.",
  "Mỗi hơi thở là một sự sống, mỗi bước chân là một đóa hoa sen nở rộ.",
  "Hạnh phúc không phải là đích đến, hạnh phúc là từng bước chân trên con đường an lạc.",
  "Không có con đường đi đến bình an. Bình an chính là con đường.",
  "Cảm ơn đời mỗi sớm mai thức dậy, ta có thêm ngày nữa để yêu thương.",
  "Như tảng đá kiên cố không gió nào lay chuyển, người trí trước khen chê lòng chẳng đổi dời.",
  "Chiến thắng vạn quân địch không bằng tự thắng mình. Tự thắng mình là chiến công oanh liệt nhất.",
  "Buông xả muộn phiền, đón nhận an nhiên. Tâm không vướng bận, tháng ngày thong dong.",
  "Quá khứ đã qua, tương lai chưa đến. Chỉ có phút giây hiện tại là mầu nhiệm.",
  "Ý dẫn đầu các pháp, ý làm chủ ý tạo. Với ý nghĩ thanh tịnh, an lạc bước theo sau.",
  "Gieo một hạt giống lành, gặt một đời an vui. Lòng từ trải muôn phương, phước đức dày sâu nặng.",
  "Hãy giữ tâm trong trẻo như mặt nước hồ thu, lắng đọng mọi thị phi bụi trần.",
  "Vạn sự tùy duyên, duyên đến thì đón, duyên đi thì buông. Lòng thanh thản như mây trời.",
  "Nụ cười của bạn đem lại an lành cho người khác, và cho cả chính bạn.",
  "Hương các loài hoa thơm không bay ngược chiều gió, nhưng hương người đức hạnh bay khắp cả muôn phương.",
  "Đời ngắn như giấc mộng, sao bận lòng hơn thua. Một niệm tâm từ ái, hóa giải ngàn oán xưa.",
  "Sống trọn vẹn từng phút giây, yêu thương không điều kiện, lắng nghe bằng cả trái tim.",
  "Không có gì quý hơn sự an lạc trong tâm hồn. Bình yên là gia tài lớn nhất.",
  "Từng giọt nước nhỏ tí, lâu ngày cũng đầy lu. Chớ khinh việc thiện nhỏ, phước báu tích ngàn sau.",
  "Dù đi khắp thế gian tìm người đáng yêu hơn chính mình, bạn sẽ không tìm thấy. Hãy thương mình và thương muôn loài.",
  "Tĩnh lặng để lắng nghe tiếng nói sâu thẳm của sự sống.",
  "Một ngọn nến có thể thắp sáng hàng ngàn ngọn nến khác mà không hề hao tổn. Hạnh phúc sẻ chia sẽ nhân lên gấp bội.",
  "Lắng lòng nghe tiếng chuông ngân, muộn phiền tan biến tâm thần thảnh thơi.",
  "Đóa hoa sen mọc từ bùn lầy mà chẳng nhiễm mùi bùn, người trí giữa hồng trần giữ trọn nét thuần lương.",
  "Hãy dịu dàng với chính mình, cuộc đời này vốn đã đủ nghiêm khắc rồi.",
  "Trời xanh mây trắng nắng vàng, tâm không vướng bận thênh thang lối về.",
  "Nhìn người bằng ánh mắt từ bi, nghe đời bằng đôi tai thấu hiểu.",
  "An trú trong từng hơi thở, nụ cười nở trên môi, bình an trong từng khoảnh khắc."
];

export class ZenQuoteManager {
  private currentIndex: number = 0;
  private timer: number | null = null;
  private element: HTMLElement | null = null;
  private intervalMs: number = 15000; // Đổi câu mỗi 15 giây

  constructor(elementId: string = "daily-quote", intervalMs: number = 15000) {
    this.intervalMs = intervalMs;
    // Khởi tạo ngẫu nhiên câu đầu tiên để mỗi lần vào chùa đều tươi mới
    this.currentIndex = Math.floor(Math.random() * ZEN_QUOTES.length);
    this.init(elementId);
  }

  private init(elementId: string) {
    this.element = document.getElementById(elementId);
    if (this.element) {
      this.element.innerText = `"${ZEN_QUOTES[this.currentIndex]}"`;
    }
    this.startAutoRotate();
  }

  public nextQuote() {
    if (!this.element) {
      this.element = document.getElementById("daily-quote");
    }
    if (!this.element) return;

    // Hiệu ứng mờ dần (fade out)
    this.element.classList.add("fade-out");

    setTimeout(() => {
      // Đổi câu kế tiếp (tránh lặp câu cũ)
      let nextIdx = (this.currentIndex + 1) % ZEN_QUOTES.length;
      this.currentIndex = nextIdx;

      if (this.element) {
        this.element.innerText = `"${ZEN_QUOTES[this.currentIndex]}"`;
        // Hiệu ứng hiện rõ lại (fade in)
        this.element.classList.remove("fade-out");
      }
    }, 400);
  }

  public startAutoRotate() {
    this.stopAutoRotate();
    this.timer = window.setInterval(() => {
      this.nextQuote();
    }, this.intervalMs);
  }

  public stopAutoRotate() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
