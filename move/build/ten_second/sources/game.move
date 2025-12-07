/// ============================================================================
/// 10 SANİYE CHALLENGE - Sui Object Modelini Öğreten Oyun
/// ============================================================================
/// 
/// Bu modül, Sui'nin en güçlü özelliklerini öğretir:
/// 
/// 🔷 SHARED OBJECTS - Herkesin erişebildiği nesneler (Leaderboard)
/// 🔶 OWNED OBJECTS - Sadece sahibinin kullanabildiği nesneler (Game)
/// ⏰ CLOCK OBJECT - Blockchain'de güvenilir zaman kaynağı
/// 📡 EVENTS - Frontend'e bilgi gönderme
/// 
/// ============================================================================
/// 
/// 🎓 TEMEL KAVRAM: SHARED vs OWNED OBJECTS
/// 
/// Sui'de nesneler iki şekilde saklanabilir:
/// 
/// 🔶 OWNED (Sahipli):
///    - Tek bir adrese ait
///    - Sadece sahip değiştirebilir
///    - İşlemler paralel çalışabilir (hızlı!)
///    - Örnek: Game nesnesi - senin oyunun
/// 
/// 🔷 SHARED (Paylaşımlı):
///    - Sahibi YOK
///    - Herkes okuyabilir/yazabilir
///    - İşlemler sıralı (konsensüs gerekir)
///    - Örnek: Leaderboard - herkesin puanları
/// 
/// ============================================================================
module ten_second::game {
    use std::option;
    use std::option::Option;
    use std::u64;
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context;
    use sui::tx_context::TxContext;

    /// ========================================================================
    /// HATA KODLARI
    /// ========================================================================
    /// Move'da runtime hataları için sayısal kodlar kullanılır
    const ERR_ALREADY_STARTED: u64 = 1;  // Timer zaten çalışıyor!
    const ERR_NOT_STARTED: u64 = 2;      // Timer henüz başlamadı!

    /// Hedef süre: Tam 10 saniye = 10,000 milisaniye
    const TARGET_MS: u64 = 10_000;

    /// ========================================================================
    /// GAME STRUCT - Kişisel Oyun Nesnesi (OWNED)
    /// ========================================================================
    /// 
    /// Bu struct her oyuncunun KENDİ oyun durumunu tutar.
    /// 
    /// 💡 Neden `has key` ama `has store` YOK?
    /// - `has key` = Blockchain'de bağımsız nesne olabilir
    /// - `has store` YOK = Başka nesnelerin içine KOYULAMAZ
    /// - Bu, Game'in sadece doğrudan sahiplikte olmasını sağlar
    /// 
    /// 📊 OPTION<u64> Nedir?
    /// - Bir değer var mı yok mu belirsiz olduğunda kullanılır
    /// - option::none() = Değer yok
    /// - option::some(x) = Değer x
    /// - Timer çalışmıyorsa → none, çalışıyorsa → some(başlangıç_zamanı)
    /// 
    public struct Game has key {
        id: UID,                       // Benzersiz oyun ID'si
        best_diff_ms: u64,             // En iyi skor (10 saniyeye fark, ms cinsinden)
        active_start_ms: Option<u64>,  // Aktif timer başlangıç zamanı (veya null)
    }

    /// ========================================================================
    /// ENTRY STRUCT - Liderlik Tablosu Kaydı
    /// ========================================================================
    /// 
    /// 💡 ABILITIES (Yetenekler) açıklaması:
    /// - `store` = Başka nesnelerin içinde saklanabilir (vector içinde)
    /// - `copy` = Kopyalanabilir
    /// - `drop` = Silinebilir (scope'tan çıkınca otomatik temizlenir)
    /// 
    public struct Entry has store, copy, drop {
        player: address,       // Oyuncunun cüzdan adresi
        best_diff_ms: u64,     // En iyi skoru
        name: vector<u8>,      // Takma adı (bytes olarak)
    }

    /// ========================================================================
    /// LEADERBOARD STRUCT - Global Liderlik Tablosu (SHARED)
    /// ========================================================================
    /// 
    /// 🌍 SHARED OBJECT:
    /// - share_object() ile oluşturulur
    /// - Herkes bu nesneyi okuyabilir ve yazabilir
    /// - Global durum için ideal (liderlik tablosu, oyun odaları, vb.)
    /// 
    /// ⚠️ DİKKAT: Shared object işlemleri owned'a göre yavaştır
    /// Çünkü ağdaki tüm validator'ların anlaşması gerekir
    /// 
    public struct Leaderboard has key {
        id: UID,                   // Benzersiz ID
        entries: vector<Entry>,    // Tüm oyuncuların skorları
    }

    /// ========================================================================
    /// EVENT - Frontend'e Bilgi Gönderme
    /// ========================================================================
    /// 
    /// 📡 EVENTS nedir?
    /// - Blockchain'den dış dünyaya bilgi göndermenin yolu
    /// - Frontend bu event'leri dinleyebilir
    /// - İşlem sonuçlarını UI'a iletmek için kullanılır
    /// 
    public struct StoppedEvent has copy, drop {
        player: address,   // Kim durdurdu?
        diff_ms: u64,      // Bu denemede fark ne kadar?
        new_best_ms: u64,  // Yeni en iyi skor ne?
    }

    /// ========================================================================
    /// CREATE LEADERBOARD - Global Liderlik Tablosu Oluştur
    /// ========================================================================
    /// 
    /// 🔷 share_object() vs transfer():
    /// 
    /// transfer(obj, addr) → Nesneyi bir adrese GÖNDER (owned olur)
    /// share_object(obj)   → Nesneyi HERKESE AÇ (shared olur)
    /// 
    /// BU İŞLEM TEK SEFERLİK: Bir kez shared olunca geri alınamaz!
    /// 
    public entry fun create_leaderboard(ctx: &mut TxContext) {
        let board = new_leaderboard(ctx);
        // 🔷 PAYLAŞ: Artık bu nesnenin sahibi yok, herkes erişebilir
        transfer::share_object(board);
    }

    /// ========================================================================
    /// CREATE GAME - Kişisel Oyun Nesnesi Oluştur
    /// ========================================================================
    /// 
    /// 🔶 transfer() kullanımı:
    /// - Nesneyi belirli bir adrese gönderir
    /// - O adresten başka kimse bu nesneyi kullanamaz
    /// - Bu güvenlik sağlar: Oyun durumun sadece senindir!
    /// 
    public entry fun create_game(ctx: &mut TxContext) {
        let game = new_game(ctx);
        // 🔶 GÖNDER: Bu Game artık çağıranın cüzdanına ait
        transfer::transfer(game, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// START - Timer'ı Başlat
    /// ========================================================================
    /// 
    /// ⏰ CLOCK OBJECT (0x6) Nedir?
    /// - Sui ağının resmi zaman kaynağı
    /// - Sabit adres: 0x0000000000000000000000000000000000000000000000000000000000000006
    /// - timestamp_ms() → Şu anki zaman (milisaniye cinsinden)
    /// 
    /// ❓ Neden kendi zamanımızı kullanmıyoruz?
    /// - Kullanıcı sahte zaman gönderebilir!
    /// - Clock object validator'lar tarafından doğrulanır
    /// - Güvenilir ve manipüle edilemez
    /// 
    public entry fun start(game: &mut Game, clock: &Clock) {
        // Güvenlik: Timer zaten çalışıyorsa hata ver
        assert!(!option::is_some(&game.active_start_ms), ERR_ALREADY_STARTED);
        
        // Clock'tan şu anki zamanı al ve kaydet
        game.active_start_ms = option::some(clock::timestamp_ms(clock));
    }

    /// ========================================================================
    /// STOP - Timer'ı Durdur ve Skor Hesapla
    /// ========================================================================
    /// 
    /// 🎯 BU FONKSİYON 3 FARKLI NESNE KULLANIYOR:
    /// 
    /// 1. game: &mut Game (OWNED, yazılabilir)
    ///    → Senin oyun nesnen, skorunu güncellemek için
    /// 
    /// 2. board: &mut Leaderboard (SHARED, yazılabilir)
    ///    → Global liderlik tablosu, herkes yazabilir
    /// 
    /// 3. clock: &Clock (SHARED, sadece okunabilir)
    ///    → Sistem saati, şu anki zamanı almak için
    /// 
    /// 💡 Bu kombinasyon Sui'nin gücünü gösteriyor:
    /// - Farklı sahiplik türlerinde nesneler tek işlemde birleştirilebilir
    /// - Buna "composability" (birleştirilebilirlik) denir
    /// 
    public entry fun stop(
        game: &mut Game,
        board: &mut Leaderboard,
        clock: &Clock,
        name: vector<u8>,
        ctx: &mut TxContext,
    ) {
        // Timer çalışıyor mu kontrol et
        assert!(option::is_some(&game.active_start_ms), ERR_NOT_STARTED);
        
        // Başlangıç zamanını al (ve Option'dan çıkar)
        let start_ms = option::extract(&mut game.active_start_ms);
        
        // Şu anki zamanı al
        let now_ms = clock::timestamp_ms(clock);
        
        // Geçen süreyi hesapla
        let elapsed = now_ms - start_ms;
        
        // 10 saniyeye olan farkı bul (mutlak değer)
        let diff = diff_from_target(elapsed);

        // Kişisel en iyi skoru güncelle
        if (diff < game.best_diff_ms) {
            game.best_diff_ms = diff;
        };
        
        // Global liderlik tablosunu güncelle
        update_leaderboard(board, tx_context::sender(ctx), diff, name);
        
        // Timer'ı sıfırla (tekrar oynamak için)
        game.active_start_ms = option::none();

        // 📡 Frontend'e event gönder
        event::emit(StoppedEvent {
            player: tx_context::sender(ctx),
            diff_ms: diff,
            new_best_ms: game.best_diff_ms,
        });
    }

    /// Reset a game to allow replays during demos.
    public entry fun reset_best(game: &mut Game) {
        game.best_diff_ms = u64::max_value!();
        game.active_start_ms = option::none();
    }

    fun update_leaderboard(board: &mut Leaderboard, player: address, diff: u64, name: vector<u8>) {
        let len = vector::length(&board.entries);
        let mut i: u64 = 0;
        while (i < len) {
            let entry = vector::borrow_mut(&mut board.entries, i);
            if (entry.player == player) {
                if (diff < entry.best_diff_ms) {
                    entry.best_diff_ms = diff;
                };
                if (!vector::is_empty(&name)) {
                    entry.name = name;
                };
                return ()
            };
            i = i + 1;
        };
        let final_name = if (vector::is_empty(&name)) default_name(player) else name;
        vector::push_back(&mut board.entries, Entry { player, best_diff_ms: diff, name: final_name });
    }

    fun diff_from_target(elapsed_ms: u64): u64 {
        if (elapsed_ms >= TARGET_MS) {
            elapsed_ms - TARGET_MS
        } else {
            TARGET_MS - elapsed_ms
        }
    }

    fun new_game(ctx: &mut TxContext): Game {
        Game {
            id: object::new(ctx),
            best_diff_ms: u64::max_value!(),
            active_start_ms: option::none(),
        }
    }

    fun new_leaderboard(ctx: &mut TxContext): Leaderboard {
        Leaderboard {
            id: object::new(ctx),
            entries: vector::empty(),
        }
    }

    #[test]
    fun start_stop_updates_best_and_leaderboard() {
        let mut ctx = tx_context::new(@0xB, tx_context::dummy_tx_hash_with_hint(1), 0, 0, 0);
        let mut clock_obj = clock::create_for_testing(&mut ctx);
        let mut board = new_leaderboard(&mut ctx);
        let mut game = new_game(&mut ctx);

        clock::set_for_testing(&mut clock_obj, 0);
        start(&mut game, &clock_obj);

        clock::set_for_testing(&mut clock_obj, 10_020);
        stop(&mut game, &mut board, &clock_obj, b"tester", &mut ctx);

        assert!(game.best_diff_ms == 20, 100);
        assert!(vector::length(&board.entries) == 1, 101);
        let entry = vector::borrow(&board.entries, 0);
        assert!(entry.best_diff_ms == 20, 102);
        assert!(entry.name == b"tester", 105);

        clock::set_for_testing(&mut clock_obj, 20_030);
        start(&mut game, &clock_obj);

        clock::set_for_testing(&mut clock_obj, 30_035);
        stop(&mut game, &mut board, &clock_obj, b"tester2", &mut ctx);

        assert!(game.best_diff_ms == 5, 103);
        let entry_again = vector::borrow(&board.entries, 0);
        assert!(entry_again.best_diff_ms == 5, 104);
        assert!(entry_again.name == b"tester2", 106);

        transfer::share_object(board);
        transfer::transfer(game, tx_context::sender(&ctx));
        clock::destroy_for_testing(clock_obj);
    }

    fun default_name(_addr: address): vector<u8> {
        b"player"
    }
}
