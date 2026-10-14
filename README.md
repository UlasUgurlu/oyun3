# Nabız

Türkçe, çevrimdışı bir refleks oyunu. İbre renkli yaydayken oyun alanına dokun; beyaz merkez mükemmel isabettir. Seri puanları artırır, 5 mükemmel isabet Odak gücünü doldurur.

## Modlar

- **Klasik:** Her isabette yön değişir, tempo artar, hedef daralır. Bir kıl payı kalkanı vardır.
- **Kaos:** 3 can. Dörder isabetlik bölümlerde aşırı akım (hız ve çift puan), ters kural (aynı yönde ilerleme), sahte sinyal (mor çizgili tuzak) ve nefes aralığı (geniş hedef) döner.
- **Serbest:** Daha yavaş ve geniş hedefler. Hata turu bitirmez; antrenmanı oyuncu bitirir. Rekabetçi rekor ve günlük görevler bu moddan etkilenmez.
- **Günün Nabzı:** Tarihe bağlı aynı hedef dizisi, günde üç deneme, günlük seri ve paylaşılabilir sonuç.

Günlük görevler XP kazandırır; seviyeler ve toplam isabetle açılan beş tema ilerlemeyi gösterir. Eski `nabiz/profile/v1` kaydı v2 yapısına taşınır ve aynı anahtarda korunur.

## Performans

Kadran statik SVG, arka plan yerel bir gradyandır. İbre her hedefte bir doğrusal Reanimated animasyonuyla UI iş parçacığında hareket eder. JavaScript yalnızca dokunuşlarda, duraklatmada ve hedef süresi dolduğunda çalışır. Sürekli sensör, kare döngüsü, büyük blur ya da Skia yoktur. Dokunuş saf motorun zaman formülüyle değerlendirilir. Ses havuzları sınırlıdır; arka plan ve kapatma yaşam döngüsü yönetilir. Pil dostu mod kısa görsel efektleri kapatır.

Expo SDK 57 / React Native 0.86 / TypeScript / Reanimated / react-native-svg.

## Geliştirme

```bash
npm ci
npx expo start
npm run typecheck
npm run lint
npm test -- --runInBand
```

Native klasörler Expo yapılandırmasından üretilir; elle düzenlenmez. Yeni bağımlılıklar `npx expo install` ile eklenir.

## APK

GitHub Actions `.github/workflows/oyun3-apk.yml`, `main` güncellemelerinde `nabiz.apk` üretir. Derleme ve emülatör testleri ayrı runner kullanır. APK, imza ve içerik kontrollerinin ardından önceki sürüm üzerine kurulup çevrimdışı menü, dört mod, ayarlar, iki dakikalık oynanış, bellek/kare tanıları ve arka plandan dönüş testlerinden geçer. Tanılar ve gerçek ekran görüntüleri Actions artifact'inde saklanır. Başarılı paket GitHub Releases'e eklenir.

Android 7 ve üzeri ARM64 telefonlar; otomatik test için x86_64. Kişisel test imzası önceki APK ile aynıdır. Mağaza yayını ayrı yayın anahtarı gerektirir.

## Tasarım kaynakları

Nabız simgesi ImageGen ile bu oyun için oluşturuldu: gece mavisi zeminde mercan kalp atışı çizgisi ve buz rengi açık yörünge. Üretim istemi `assets/LOGO_PROMPT.md` içinde, menü varlığı `assets/nabiz-logo.png` dosyasındadır. Sesler `tools/synth_sounds.py` ile sentezlendi; yazı tipi Bricolage Grotesque.
