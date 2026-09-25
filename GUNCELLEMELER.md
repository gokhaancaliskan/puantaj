# Puantaj Uygulaması Güncelleme Notları

Bu dosya, uygulamaya son zamanlarda yapılan ekleme ve düzeltmeleri takip etmek amacıyla oluşturulmuştur.

## Yapılan Güncellemeler (Eylül 2026)

### 1. Konum ve Giriş/Çıkış Sistemi Optimizasyonu
- **Daha Stabil Konum Alma:** Eskiden sadece son bilinen konumu (`getLastKnownPositionAsync`) alan sistem, anlık ve dengeli konumu da (`getCurrentPositionAsync`) kontrol edecek şekilde güncellendi. Bu sayede uygulamanın giriş/çıkış esnasında kullanıcının konumunu algılayamama veya eski konumu baz alma sorunu çözüldü.

### 2. Anasayfa Harita Tasarımı ve Kullanıcı Deneyimi
- **Kare Harita Görünümü:** Anasayfada yer alan küçük boyutlu harita daha net görülebilmesi için daha geniş ve "kare" (`aspectRatio: 1`) bir formata getirildi.
- **Tam Ekran Harita (Modal):** Küçük haritanın üzerine tıklanabilir görünmez bir katman eklendi. Kullanıcılar artık anasayfadaki küçük haritaya tıkladıklarında, haritayı tam sayfa büyük bir şekilde görebiliyor ve "X" butonu ile tekrar kapatabiliyor.
- **Canlı Kullanıcı Konumu:** Kullanıcının anlık konumunun ("Siz" adıyla, mavi işaretçi ile) hem küçük haritada hem de tam ekran haritada iş yeri konumunun (kırmızı işaretçi) yanında gösterilmesi sağlandı. Gerekli konum izinleri ana sayfa açılışında alındı.

### 3. Raporlama ve Mesai Toleransı (30 Dakika Kuralı)
- **Mesai Esnekliği:** Kullanıcıların 18:00 olan mesai bitiminde; eğer çıkış saatleri 18:30'u geçmiyorsa fazladan çalışılan sürenin (örneğin 25 dakika) raporlamaya mesai olarak "yansıtılmaması", ancak 18:30'u geçerse hesaplamanın doğrudan 18:00'den itibaren yapılarak tüm sürenin dahil edilmesi kuralı sisteme entegre edildi.

### 4. CSV Rapor Çıktısı Geliştirmeleri
- **Boş Rapor Çıktısı:** Veritabanında hiç kayıt yokken kullanıcı rapor (CSV) oluşturmak istediğinde yaşanan hatalar giderildi. Kayıt yokken de başlıkları barındıran geçerli bir boş CSV şablonunun oluşturulup paylaşılması sağlandı.
- **iOS Uyumluluğu:** Paylaşım modülüne (`expo-sharing`) Apple (iOS) cihazlar için zorunlu olan `UTI` dosya formatı bildirimi eklendi. Bu sayede iOS cihazlarda CSV dosyasının paylaşılamaması / sistemin çökmesi sorunu önlendi.
- **Okunabilir Tarih ve Saatler:** Sistemin ürettiği karmaşık tarih stringleri (`2026-09-25T18...`), doğrudan "25.09.2026 18:00" gibi okunabilir lokal formata çevrildi.
- **Gün İsimleri:** Hem anasayfadaki son 7 gün listesine hem de indirilen CSV raporuna tarihlerin yanına o günün ismi (örn. "25.09.2026 Cuma") dinamik olarak eklendi.

---
*Uygulama genel olarak kontrol edilmiş, arayüz bileşenleri, veri yönetimi ve export işlemleri sağlıklı ve tam çalışır hale getirilmiştir.*
