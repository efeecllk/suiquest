/// ============================================================================
/// SUI BANK - DeFi Temellerini Öğreten Banka Simülatörü
/// ============================================================================
/// 
/// Bu modül, Sui blockchain'deki en önemli DeFi kavramlarını öğretir:
/// 
/// 💰 COIN vs BALANCE - Token'ların iki farklı hali
/// 🔄 CONVERSION - Coin ↔ Balance dönüşümü
/// 🏦 CUSTODY - Fonların güvenli saklanması
/// 
/// ============================================================================
/// 
/// 🎓 TEMEL KAVRAM: COIN vs BALANCE NEDİR?
/// 
/// Düşün ki elinde 100 TL var:
/// 
/// 📱 COIN<SUI> = Cebindeki nakit para
///    - Bağımsız bir nesne (kendi ID'si var)
///    - Transfer edilebilir (birine verebilirsin)
///    - Cüzdanında görünür
/// 
/// 🏦 BALANCE<SUI> = Banka hesabındaki para
///    - Başka bir nesnenin İÇİNDE saklanır
///    - Doğrudan transfer edilemez
///    - Önce Coin'e çevrilmeli
/// 
/// ============================================================================
module ten_second::sui_bank {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// ========================================================================
    /// HATA KODLARI
    /// ========================================================================
    /// Move'da hatalar sayısal kodlarla belirtilir
    const EInsufficientBalance: u64 = 0;  // Yetersiz bakiye hatası

    /// ========================================================================
    /// BANK ACCOUNT - Banka Hesabı Struct'ı
    /// ========================================================================
    /// 
    /// Bu struct neden Balance<SUI> tutuyor, Coin<SUI> değil?
    /// 
    /// ✅ BALANCE kullanmanın avantajları:
    /// - Hesabın İÇİNDE güvenle saklanır
    /// - Sadece hesap sahibi erişebilir
    /// - Birden fazla yatırma işlemi birleştirilebilir
    /// 
    /// ❌ COIN kullansaydık:
    /// - Her coin ayrı bir nesne olurdu
    /// - Karmaşık yönetim gerekir
    /// - Profesyonel DeFi uygulamalar Balance kullanır
    /// 
    public struct BankAccount has key, store {
        id: UID,                  // Hesabın benzersiz kimliği
        balance: Balance<SUI>,    // SUI bakiyesi (iç depolama)
    }

    /// ========================================================================
    /// CREATE ACCOUNT - Yeni Banka Hesabı Aç
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Boş bir banka hesabı oluşturur
    /// 
    /// Bu pattern tüm Sui uygulamalarında kullanılır:
    /// 1. Yeni object oluştur
    /// 2. Kullanıcıya transfer et
    /// 
    #[allow(lint(self_transfer))]
    public entry fun create_account(ctx: &mut TxContext) {
        let account = BankAccount {
            id: object::new(ctx),      // Yeni benzersiz ID
            balance: balance::zero(),  // Başlangıç bakiyesi: 0 SUI
        };
        // Hesabı oluşturan kişiye gönder
        transfer::transfer(account, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// DEPOSIT - Para Yatır
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Cüzdandaki Coin'i hesaptaki Balance'a çevirir
    /// 
    /// 🔄 DÖNÜŞÜM AKIŞI:
    /// 
    ///   [Coin<SUI>]  ──coin::into_balance()──►  [Balance<SUI>]
    ///   (Cüzdanda)                              (Hesapta)
    /// 
    /// 💡 ÖNEMLİ: into_balance() Coin'i YOK EDER ve Balance döndürür
    /// Bu güvenli çünkü toplam değer korunur (conservation of value)
    /// 
    public entry fun deposit(account: &mut BankAccount, coin: Coin<SUI>) {
        // ADIM 1: Coin'i Balance'a dönüştür
        // NOT: Bu işlem Coin nesnesini tüketir (consume)!
        let coin_balance = coin::into_balance(coin);
        
        // ADIM 2: Yeni Balance'ı mevcut bakiyeye ekle
        // join() = iki Balance'ı birleştir
        balance::join(&mut account.balance, coin_balance);
        
        // 🎯 SONUÇ: Coin yok oldu, değeri hesaba eklendi
    }

    /// ========================================================================
    /// WITHDRAW - Para Çek
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Hesaptaki Balance'ı Coin'e çevirip cüzdana gönderir
    /// 
    /// 🔄 TERS DÖNÜŞÜM:
    /// 
    ///   [Balance<SUI>]  ──balance::split()──►  [Balance parçası]
    ///                   ──coin::from_balance()──►  [Coin<SUI>]
    /// 
    /// 🔒 GÜVENLİK: assert! ile bakiye kontrolü yapılır
    /// Yetersiz bakiye varsa işlem BAŞARISIZ olur (atomiklik!)
    /// 
    #[allow(lint(self_transfer))]
    public entry fun withdraw(
        account: &mut BankAccount, 
        amount: u64,               // Çekilecek miktar (MIST cinsinden)
        ctx: &mut TxContext
    ) {
        // ADIM 1: Yeterli bakiye var mı kontrol et
        // assert! = Koşul yanlışsa işlemi iptal et
        assert!(
            balance::value(&account.balance) >= amount, 
            EInsufficientBalance  // Hata kodu: 0
        );
        
        // ADIM 2: İstenen miktarı Balance'dan ayır
        // split() = Mevcut Balance'dan bir parça kopar
        let withdrawn_balance = balance::split(&mut account.balance, amount);
        
        // ADIM 3: Balance'ı Coin'e dönüştür
        // from_balance() yeni bir Coin nesnesi yaratır
        let coin = coin::from_balance(withdrawn_balance, ctx);
        
        // ADIM 4: Coin'i kullanıcının cüzdanına gönder
        // public_transfer = Herkesin alabileceği şekilde gönder
        transfer::public_transfer(coin, tx_context::sender(ctx));
        
        // 🎯 SONUÇ: Hesaptan düştü, cüzdana geldi!
    }

    /// ========================================================================
    /// ADD INTEREST - Faiz Ekle (Kavramsal)
    /// ========================================================================
    /// 
    /// ⚠️ NOT: Bu fonksiyon eğitim amaçlıdır, gerçekte çalışmaz!
    /// 
    /// Gerçek DeFi'de faiz nereden gelir?
    /// - Lending pools (borç verme havuzları)
    /// - Staking rewards (stake ödülleri) 
    /// - Protocol fees (protokol ücretleri)
    /// 
    /// SUI'yi yoktan yaratamayız - bu blockchain'in temel kuralı!
    /// 
    public entry fun add_interest(account: &mut BankAccount, ctx: &mut TxContext) {
        let current = balance::value(&account.balance);
        // Konsept: %10 faiz hesapla
        let _interest_amount = current / 10;
        // Gerçekte: Faiz için başka bir kaynaktan SUI gelmeli
        let _ = ctx; // Kullanılmayan değişken uyarısını bastır
    }

    /// ========================================================================
    /// GET BALANCE - Bakiye Sorgula
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Hesaptaki toplam bakiyeyi döndürür
    /// 
    /// 📖 VIEW FUNCTION (Görüntüleme Fonksiyonu):
    /// - Sadece okuma yapar (&BankAccount - mutable değil!)
    /// - Blockchain durumunu DEĞİŞTİRMEZ
    /// - Gas ücreti ÇOK DÜŞÜK
    /// 
    public fun get_balance(account: &BankAccount): u64 {
        balance::value(&account.balance)
    }
}

/// ============================================================================
/// 📚 ÖZET: BU MODÜLDEN NE ÖĞRENDİK?
/// ============================================================================
/// 
/// 1. COIN vs BALANCE farkı - DeFi'nin temel yapı taşı
/// 2. Ownership (Sahiplik) - Kim neyi değiştirebilir
/// 3. Conversion (Dönüşüm) - into_balance() ve from_balance()
/// 4. Error Handling - assert! ile güvenli kontroller
/// 
/// Bu kavramlar TÜM Sui DeFi uygulamalarında kullanılır:
/// - DEX'ler (Merkeziyetsiz Borsalar)
/// - Lending Protocols (Borç Verme)
/// - Staking (Stake Etme)
/// - Liquidity Pools (Likidite Havuzları)
/// 
/// ============================================================================
