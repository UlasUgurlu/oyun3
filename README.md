# Nabız

## oyun3 APK

GitHub Actions `.github/workflows/oyun3-apk.yml` her `main` güncellemesinde Android release APK üretir. Çıktı dosyası `oyun3.apk` adını taşır; oyun kodu ve tüm medya dosyaları içine gömülür. APK, çevrimdışı emülatörde açılış, ilk tur ve arka plandan dönüş kontrollerini geçtikten sonra GitHub Releases bölümüne eklenir.

Derleme Android 7 ve üzerindeki ARM64 cihazları destekler. x86_64 desteği otomatik emülatör kontrolü için de pakete eklenir. Kişisel kurulum için Expo şablonunun test imzası kullanılır. Mağaza yayını için kişisel yayın anahtarı ile imzalama ayrıca yapılandırılmalıdır.

Tek dokunuşla oynanan bir zamanlama oyunu. İğne halkanın etrafında döner; renkli yayın içindeyken ekrana dokunursan isabet. Her isabette yön değişir, iğne hızlanır, yay daralır. Yayın tam ortası "mükemmel" sayılır ve seri çarpanını büyütür.

Expo SDK 57, React Native 0.86, TypeScript, Skia.

## Görsel ve ses tasarımı

**3B sahne (React Native Skia + Reanimated):**
- Kadran 24° geriye yatık durur. Gerçek perspektif dönüşümü sayesinde halka masada duran bir nesne gibi görünür, altına yumuşak bir gölge düşer.
- Halka üstten ışık alan metal bir boru gibi çizilir: ışık-gölge geçişi, iç kenarda yansıma çizgisi ve dış kenarda koyu hat.
- Merkezde parlak noktası ve kenar ışığı olan bir cam küre var. Puan bunun üzerinde katman katman kabartılmış 3B rakamlarla durur.
- Hedef yay neon gibi parlar. Mükemmel isabette altın renkte yanıp söner.
- İğne silindirik gövdeli, ucunda parlayan bir mücevher var ve arkasında altın bir ışık izi bırakır.
- Her isabette halkadan dışarı bir kalp atışı dalgası yayılır, küre nabız gibi atar ve iğnenin ucundan ışıklı parçacıklar saçılır (mükemmelde altın).
- Art arda 3 mükemmelden sonra "ateş modu" açılır: halkanın etrafında altın bir hale yanar, arka plan ısınır.
- Kaybedince sahne kırmızı bir şokla titrer.
- Arka planda farklı derinliklerde süzülen ışık küreleri var. Telefonu sağa sola eğince hem kadran hem küreler farklı hızlarda kayar (paralaks).
- Butonlar oyun konsolu tuşu gibi: altta koyu kenar, basınca aşağı iner.

**Sesler (tools/synth_sounds.py ile sıfırdan sentezlendi):**
- İsabet: derin bir kalp atışı vuruşu.
- Mükemmel: FM sentezli cam çanı, stereo yankı ve kuyrukla. Seri büyüdükçe beş notalık pentatonik dizide yükselir.
- Kıl payı: metalik kalkan çınlaması ve soldan sağa geçen rüzgâr sesi.
- Kaybetme: derin bir gümleme, düşen bir ses ve kısa bir düz çizgi bipi.
- Tur başı: yükselen bir uğultu ve ardından iki kalp atışı.
- Rekor ve yeni tema: parlayan bir çan arpeji.
- Müzik: 72 bpm'lik, kalp atışı ritmiyle akan, kesintisiz dönen bir ambiyans parçası. Oyun sırasında kısılır, menüde açılır.

Sesleri değiştirmek istersen `tools/synth_sounds.py` dosyasını düzenleyip `python3 tools/synth_sounds.py` ile yeniden üret (numpy, scipy ve ffmpeg gerekir).

## Çalıştırma

```bash
npm install
npx expo start
```

Telefonda **Expo Go** uygulamasıyla QR kodu okut. Bu projedeki tüm paketler Expo Go içinde hazır geldiği için ayrıca derleme gerekmez.

Testler ve tip denetimi:

```bash
npm test
npm run typecheck
```

## Mağaza için derleme (Android)

```bash
npx eas-cli@latest build --platform android --profile preview   # test için APK
npx eas-cli@latest build --platform android                     # Play Store için AAB
```

`app.json` içindeki `android.package` değerini (`com.nabiz.game`) kendi alan adına göre değiştir; Play Store'a bir kez yüklendikten sonra değiştirilemez. Uygulama ikonları hâlâ Expo'nun varsayılanları, yayından önce `assets/` klasöründekileri kendi tasarımınla değiştir.

## Oyun özellikleri

- **Kıl payı kalkanı:** Yayın hemen dışına (~7°) dokunursan turda bir kez kalkan seni kurtarır. Kaybettiğinde kaç derece ile kaçırdığın gerçek ölçümle yazılır.
- **Seri çarpanı:** Art arda mükemmel isabetler 2, 3, 4… puan verir. Ses perdesi seriyle yükselir.
- **Günün Nabzı:** Herkes aynı gün aynı hedef dizisini oynar. Günde 3 hak, paylaşılabilir sonuç, günlük seri. Seri kaçarsa ceza yok, sayaç sıfırdan başlar.
- **Temalar:** Toplam isabetle açılan 5 renk teması.
- **Ayarlar:** Ses efektleri, müzik, titreşim, ekran sarsıntısı ve 3B eğim hareketi ayrı ayrı kapatılabilir. Ses telefon sessizdeyken çalmaz ve arka plandaki müziği kesmez. Telefonda "hareketi azalt" açıksa eğim efekti kendiliğinden kapanır.
- **Sağlıklı oyun:** 20 dakikalık oyundan sonra bir kez nazik mola önerisi. Para tuzağı, enerji sistemi ve zorunlu reklam yok.

## Mimari

```
App.tsx                      Font yükleme, SafeArea
src/
  game/                      Saf mantık, React'ten bağımsız, testli
    constants.ts             Bütün zorluk ayarları burada
    engine.ts                Tur durumu, dokunuş değerlendirme, duraklatma
    progression.ts           Profil, rekor, günlük mod, seri, kayıt doğrulama
    rng.ts                   Tohumlu rastgele sayı üreteci ve tarih yardımcıları
    themes.ts                Renk temaları
    __tests__/engine.test.ts
  hooks/
    useNabizGame.ts          Oyun döngüsü, dokunma, animasyon tetikleyicileri
    useProfile.ts            AsyncStorage ile kalıcı profil
  feedback/Feedback.ts       Ses efektleri, müzik (expo-audio) ve titreşim (expo-haptics)
  components/
    Dial.tsx                 3B kadran: halka, hedef, iğne, küre, parçacıklar (Skia)
    Backdrop.tsx             Arka plan ışıkları, ateş modu ve şok efekti (Skia)
    ExtrudedText.tsx         Katmanlı 3B kabartma yazı
    Button.tsx               Basınca inen 3B buton
    MenuPanel, GameOverPanel, SettingsSheet, CalloutText
  screens/GameScreen.tsx     Hepsini birleştiren tek ekran
  ui/typography.ts           Yazı tipi ve ölçek
  ui/color.ts                Renk karıştırma yardımcıları
assets/sounds/               Sentezlenmiş efektler (.wav) ve müzik (.m4a)
tools/synth_sounds.py        Bütün sesleri üreten betik
```

**Neden bu şekilde?**

- **Açı zamandan hesaplanır, kare kare toplanmaz.** `açı(t) = başlangıç + yön × hız × geçen süre`. Telefon bir kare atlasa bile dokunuş milisaniye hassasiyetle doğru değerlendirilir; 60 Hz ve 120 Hz ekranlarda oyun aynı hızdadır.
- **Oyun durumu ref'te, çizim Skia ve Reanimated'de.** Her karede yalnızca iğnenin açısı paylaşımlı bir değere yazılır; parçacıklar, dalga ve haleler UI iş parçacığında GPU ile çizilir. React yalnızca skor değişince yeniden çizer.
- **Görsel ne kadar yavaşlarsa yavaşlasın oyun adil kalır.** Çok zayıf bir telefonda efektler kare atlasa bile dokunuşun değerlendirilmesi zamana dayalı olduğu için sonuç değişmez.
- **Dokunuş `onTouchStart` ile alınır.** Parmak ekrana değdiği an işlenir, `onPress` gibi parmağın kalkmasını beklemez.
- **Uygulama arka plana geçerse tur donar,** dönüşte kısa bir bekleme ile devam eder.

## Zorluğu ayarlamak

`src/game/constants.ts` dosyasındaki değerlerle oyna:

| Değer | Etkisi |
|---|---|
| `startSpeed`, `speedMultiplier`, `maxSpeed` | İğnenin ne kadar hızlı başlayıp ne kadar hızlanacağı |
| `startWidth`, `widthMultiplier`, `minWidth` | Hedef yayın genişliği ve daralma hızı |
| `perfectRatio` | Mükemmel bölgenin yay içindeki oranı |
| `graze`, `shieldsPerRound` | Kıl payı bölgesi ve tur başına kalkan sayısı |
| `dailyAttempts` | Günlük moddaki deneme hakkı |

Hedef: yeni oyuncular ilk turda ortalama 8–12 puan alsın. Arkadaşlarına oynat ve kaybettikten sonra ne kadar hızlı "Tekrar"a bastıklarına bak.
