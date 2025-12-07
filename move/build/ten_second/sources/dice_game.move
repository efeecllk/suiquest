/// ============================================================================
/// 🎲 DICE GAME - Şans Oyunu (On-Chain Randomness Tutorial)
/// ============================================================================
/// 
/// Bu modül, Sui'nin en önemli kavramlarından birini öğretir:
/// ON-CHAIN RANDOMNESS (Zincir Üstü Rastgelelik)
/// 
/// 🎲 RANDOM MODÜLü - Güvenli rastgele sayı üretimi
/// 📡 EVENTS - Sonuçları frontend'e bildirme
/// 💰 STAKE/REWARD - Bahis ve ödül sistemi
/// 
/// ============================================================================
/// 
/// 🎓 TEMEL KAVRAM: NEDen ON-CHAIN RANDOMNESS ÖNEMLİ?
/// 
/// Geleneksel yöntemler GÜVENLI DEĞİL:
/// 
/// ❌ Clock timestamp → Validator'lar manipüle edebilir
/// ❌ Object ID → Önceden tahmin edilebilir
/// ❌ Frontend random → Kullanıcı sahte değer gönderebilir
/// 
/// ✅ sui::random → Validator ağı tarafından üretilen gerçek rastgelelik
///    - Threshold cryptography kullanır
///    - Tek bir taraf manipüle edemez
///    - Tüm validator'ların anlaşması gerekir
/// 
/// ============================================================================
/// 
/// 🎯 OYUN MEKANİĞİ:
/// 
/// 1. Oyuncu bir sayı seçer (1-6)
/// 2. SUI ile bahis yapar
/// 3. Zar atılır (on-chain random)
/// 4. Eşleşirse → 6x kazanır! (1/6 şans, 6x ödül)
///    Eşleşmezse → Bahis havuza gider
/// 
/// ============================================================================
module ten_second::dice_game {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::random::{Self, Random, RandomGenerator};

    /// ========================================================================
    /// HATA KODLARI
    /// ========================================================================
    /// Move'da runtime hataları sayısal kodlarla belirtilir
    /// Bu kodlar frontend'e hata tipini bildirir
    
    /// Geçersiz tahmin (1-6 aralığında olmalı)
    const EInvalidGuess: u64 = 0;
    /// Havuzda yeterli bakiye yok (ödeme yapılamaz)
    const EInsufficientPoolBalance: u64 = 1;
    /// Bahis miktarı sıfır olamaz
    const EZeroBet: u64 = 2;

    /// ========================================================================
    /// GAME POOL - Bahis Havuzu (SHARED OBJECT)
    /// ========================================================================
    /// 
    /// 🎯 BU STRUCT'IN AMACI:
    /// Tüm bahislerin toplandığı ve ödemelerin yapıldığı merkezi havuz
    /// 
    /// 🔷 NEDEN SHARED OBJECT?
    /// - Herkes bu havuza bahis yatırabilmeli
    /// - Herkes bu havuzdan ödeme alabilmeli
    /// - Tek bir adrese ait değil → share_object() ile oluşturulur
    /// 
    /// 💰 NEDEN BALANCE<SUI>?
    /// - Fonlar güvenle nesne içinde saklanır
    /// - Birden fazla bahis birleştirilebilir
    /// - DeFi protokollerinin standart yapısı
    /// 
    public struct GamePool has key {
        id: UID,
        balance: Balance<SUI>,  // Havuzdaki toplam SUI
    }

    /// ========================================================================
    /// DICE ROLLED EVENT - Zar Sonucu Olayı
    /// ========================================================================
    /// 
    /// 📡 EVENTS NEDİR?
    /// - Blockchain'den dış dünyaya bilgi göndermenin yolu
    /// - Transaction içinde emit edilir
    /// - Frontend WebSocket ile dinleyebilir
    /// - Indexer'lar bu event'leri kaydeder
    /// 
    /// 💡 ABILITIES (Yetenekler):
    /// - `copy` = Kopyalanabilir (event emit için gerekli)
    /// - `drop` = Otomatik temizlenebilir (scope'tan çıkınca)
    /// 
    /// NOT: Events blockchain'de SAKLANMAZ, sadece emit edilir!
    /// Geçmiş event'leri görmek için indexer gerekir.
    /// 
    public struct DiceRolled has copy, drop {
        player: address,     // Kim oynadı?
        guess: u8,           // Ne tahmin etti? (1-6)
        rolled: u8,          // Zar ne geldi? (1-6)
        bet_amount: u64,     // Ne kadar bahis yaptı? (MIST)
        won: bool,           // Kazandı mı?
        payout: u64,         // Ne kadar kazandı? (MIST, 0 if lost)
    }

    /// ========================================================================
    /// CREATE POOL - Havuz Oluştur (Admin Fonksiyonu)
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Yeni bir boş bahis havuzu oluşturur
    /// 
    /// ⚠️ ÖNEMLİ: Bu fonksiyon sadece bir kez çağrılmalı!
    /// Birden fazla havuz karışıklık yaratır.
    /// 
    /// Gerçek uygulamalarda:
    /// - Admin kontrolü eklenir (sadece deployer çağırabilir)
    /// - init() fonksiyonu kullanılır (otomatik çalışır)
    /// 
    public entry fun create_pool(ctx: &mut TxContext) {
        let pool = GamePool {
            id: object::new(ctx),      // Benzersiz havuz ID'si
            balance: balance::zero(),  // Başlangıç: 0 SUI
        };
        // 🔷 SHARE: Havuzu herkese aç
        // Artık herkes bu havuzu görebilir ve kullanabilir
        transfer::share_object(pool);
    }

    /// ========================================================================
    /// FUND POOL - Havuza Para Ekle
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Havuza SUI ekleyerek ödeme kapasitesini artırır
    /// 
    /// 💰 COIN → BALANCE DÖNÜŞÜMÜ:
    /// - coin::into_balance() Coin nesnesini YOK EDER
    /// - Değeri Balance'a çevirir
    /// - balance::join() ile mevcut bakiyeye ekler
    /// 
    /// Bu pattern'ı SuiBank'ta detaylı öğrendik!
    /// 
    public entry fun fund_pool(pool: &mut GamePool, coin: Coin<SUI>) {
        // Coin'i Balance'a çevir ve havuza ekle
        let coin_balance = coin::into_balance(coin);
        balance::join(&mut pool.balance, coin_balance);
    }

    /// ========================================================================
    /// PLAY - Ana Oyun Fonksiyonu 🎲
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Bahis yap, zar at, kazan veya kaybet!
    /// 
    /// 📥 PARAMETRELER:
    /// 
    /// 1. pool: &mut GamePool
    ///    - Bahis havuzu (shared object)
    ///    - Bahisler buraya girer, ödemeler buradan çıkar
    /// 
    /// 2. bet: Coin<SUI>
    ///    - Oyuncunun yatırdığı bahis
    ///    - Cüzdandan gelen Coin nesnesi
    /// 
    /// 3. guess: u8
    ///    - Oyuncunun tahmini (1-6)
    ///    - Zar bu sayıyı gösterirse KAZANIR!
    /// 
    /// 4. r: &Random (🔷 ÖZEL SHARED OBJECT)
    ///    - Sui'nin resmi randomness kaynağı
    ///    - Sabit adres: 0x8
    ///    - Sadece OKUMA erişimi (&Random, mut değil)
    /// 
    /// 5. ctx: &mut TxContext
    ///    - Transaction bilgileri (sender, vs.)
    /// 
    /// ⚠️ ENTRY FUNCTION ZORUNLULUĞU:
    /// Random kullanan fonksiyonlar MUTLAKA entry olmalı!
    /// Bu, PTB (Programmable Transaction Block) kısıtlamalarını uygular.
    /// 
    #[allow(lint(public_random))]
    public entry fun play(
        pool: &mut GamePool,
        bet: Coin<SUI>,
        guess: u8,
        r: &Random,
        ctx: &mut TxContext
    ) {
        // ====================================================================
        // ADIM 1: GİRDİ DOĞRULAMA (Input Validation)
        // ====================================================================
        // 
        // assert! = Koşul sağlanmazsa işlemi İPTAL ET
        // Bu, atomik güvenliği sağlar - ya tamamı olur ya hiçbiri
        
        // Tahmin 1-6 arasında mı?
        assert!(guess >= 1 && guess <= 6, EInvalidGuess);
        
        // Bahis miktarını al
        let bet_amount = coin::value(&bet);
        // Bahis sıfır olamaz
        assert!(bet_amount > 0, EZeroBet);
        
        // Potansiyel ödül = bahis x 6 (1/6 şans için adil oran)
        let potential_payout = bet_amount * 6;
        
        // Havuzda yeterli para var mı? (Ödeme garantisi)
        assert!(
            balance::value(&pool.balance) >= potential_payout - bet_amount,
            EInsufficientPoolBalance
        );

        // ====================================================================
        // ADIM 2: RANDOM GENERATOR OLUŞTUR 🎲
        // ====================================================================
        // 
        // 🔐 GÜVENLİK: RandomGenerator MUTLAKA fonksiyon içinde oluşturulmalı!
        // 
        // Neden?
        // - Dışarıdan parametre olarak alınırsa, çağıran içeriği görebilir
        // - bcs::to_bytes(&generator) ile internal state okunabilir
        // - Bu da sonraki random değerlerin TAHMİN edilmesini sağlar!
        // 
        // new_generator(r, ctx):
        // - r = Random shared object'ten seed alır
        // - ctx = Transaction context'ten ek entropi
        // - Her çağrıda farklı seed → farklı sonuçlar
        // 
        let mut generator = random::new_generator(r, ctx);
        
        // ====================================================================
        // ADIM 3: ZAR AT 🎲
        // ====================================================================
        // 
        // generate_u8_in_range(&mut gen, min, max):
        // - min ve max dahil rastgele u8 üretir
        // - [1, 6] = 1, 2, 3, 4, 5, veya 6
        // 
        // ÖNEMLİ: Generator mutable olmalı!
        // Her random çağrısı internal state'i değiştirir
        // Bu, aynı generator'dan farklı değerler almayı sağlar
        // 
        let rolled = random::generate_u8_in_range(&mut generator, 1, 6);
        
        // ====================================================================
        // ADIM 4: KAZANMA/KAYBETME KONTROLÜ
        // ====================================================================
        let won = (guess == rolled);
        let player = tx_context::sender(ctx);
        
        // ====================================================================
        // ADIM 5: ÖDEME İŞLEMLERİ
        // ====================================================================
        // 
        // KAZANDIYSA:
        // 1. Bahisi havuza ekle
        // 2. 6x ödemeyi havuzdan çek
        // 3. Ödemeyi oyuncuya gönder
        // 
        // KAYBETTİYSE:
        // 1. Bahisi havuza ekle (oyuncu parasını kaybetti)
        //
        let payout: u64;
        
        if (won) {
            // 🎉 KAZANDI!
            payout = potential_payout;
            
            // Önce bahisi havuza ekle
            let bet_balance = coin::into_balance(bet);
            balance::join(&mut pool.balance, bet_balance);
            
            // Sonra ödemeyi havuzdan çek
            let payout_balance = balance::split(&mut pool.balance, payout);
            let payout_coin = coin::from_balance(payout_balance, ctx);
            
            // Ödemeyi oyuncuya gönder
            transfer::public_transfer(payout_coin, player);
        } else {
            // 😢 KAYBETTİ
            payout = 0;
            
            // Bahis havuza gider
            let bet_balance = coin::into_balance(bet);
            balance::join(&mut pool.balance, bet_balance);
        };

        // ====================================================================
        // ADIM 6: EVENT EMIT 📡
        // ====================================================================
        // 
        // event::emit() → Olayı blockchain'e yayınla
        // 
        // Bu event:
        // - Transaction digest'te görünür
        // - Indexer'lar tarafından kaydedilir
        // - Frontend WebSocket ile dinleyebilir
        // 
        // 💡 İPUCU: Events ucuz! Bolca kullanabilirsin.
        // Storage maliyeti yok çünkü sadece log'a yazılır.
        // 
        event::emit(DiceRolled {
            player,
            guess,
            rolled,
            bet_amount,
            won,
            payout,
        });
    }

    /// ========================================================================
    /// GET POOL BALANCE - Havuz Bakiyesini Sorgula
    /// ========================================================================
    /// 
    /// 📖 VIEW FUNCTION (Görüntüleme Fonksiyonu):
    /// - Sadece OKUMA yapar (&GamePool - mutable değil!)
    /// - Blockchain durumunu DEĞİŞTİRMEZ
    /// - Gas ücreti ÇOK DÜŞÜK
    /// - Sonuç MIST cinsinden (1 SUI = 1,000,000,000 MIST)
    /// 
    public fun get_pool_balance(pool: &GamePool): u64 {
        balance::value(&pool.balance)
    }
}

/// ============================================================================
/// 📚 ÖZET: BU MODÜLDEN NE ÖĞRENDİK?
/// ============================================================================
/// 
/// 1. 🎲 sui::random MODÜLÜ
///    - Random shared object (0x8)
///    - new_generator() ile generator oluştur
///    - generate_u8_in_range() ile rastgele sayı üret
///    - MUTLAKA entry function içinde kullan!
/// 
/// 2. 📡 EVENTS
///    - event::emit() ile olay yayınla
///    - has copy, drop abilities gerekli
///    - Frontend'e bilgi göndermenin yolu
///    - Indexer'lar event'leri kaydeder
/// 
/// 3. 💰 STAKE/REWARD SİSTEMİ
///    - Coin → Balance dönüşümü (into_balance)
///    - Balance → Coin dönüşümü (from_balance)
///    - Shared pool ile merkezi fon yönetimi
/// 
/// 4. 🔐 GÜVENLİK PRATİKLERİ
///    - Input validation (assert!)
///    - RandomGenerator fonksiyon-içi oluşturma
///    - Yeterli bakiye kontrolü
/// 
/// Bu kavramlar şuralarda kullanılır:
/// - 🎰 Casino & Gambling dApps
/// - 🎮 GameFi (Play-to-Earn)
/// - 🎁 NFT Loot Boxes & Gacha
/// - 🎲 On-chain Lottery
/// 
/// ============================================================================
