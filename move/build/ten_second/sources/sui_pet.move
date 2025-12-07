/// ============================================================================
/// SUI PET - Blockchain'de Sanal Evcil Hayvan Oyunu
/// ============================================================================
/// 
/// Bu modül, blockchain üzerinde çalışan bir sanal evcil hayvan oyunudur.
/// Move dilinin temel kavramlarını öğretmek için tasarlanmıştır:
/// 
/// 📦 OBJECTS (Nesneler): Pet, blockchain'de depolanan bir "nesne"dir
/// 🔑 OWNERSHIP (Sahiplik): Her Pet bir cüzdana aittir ve sadece sahibi değiştirebilir
/// ✍️ MUTABLE REFERENCES (&mut): Nesneyi değiştirmek için "ödünç alma" sistemi
/// 
/// ============================================================================
module ten_second::sui_pet {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// ========================================================================
    /// PET STRUCT - Evcil Hayvan Veri Yapısı
    /// ========================================================================
    /// 
    /// Bu struct, blockchain'de depolanan bir "object" tanımlar.
    /// 
    /// `has key` → Bu struct blockchain'de benzersiz bir ID ile saklanabilir
    /// `has store` → Bu struct başka nesnelerin içinde saklanabilir
    /// 
    /// Her Pet şu özelliklere sahiptir:
    /// - id: Blockchain'deki benzersiz kimlik (örn: 0x1a2b3c...)
    /// - hunger: Açlık seviyesi (0 = tok, 100 = çok aç)
    /// - happiness: Mutluluk seviyesi (0 = üzgün, 100 = çok mutlu)  
    /// - energy: Enerji seviyesi (0 = yorgun, 100 = enerjik)
    /// 
    public struct Pet has key, store {
        id: UID,        // Benzersiz nesne kimliği - her Pet'in parmak izi
        hunger: u64,    // Açlık: 0-100 arası (düşük = iyi)
        happiness: u64, // Mutluluk: 0-100 arası (yüksek = iyi)
        energy: u64,    // Enerji: 0-100 arası (yüksek = iyi)
    }

    /// Stat değerleri için maksimum limit
    const MAX_STAT: u64 = 100;

    /// ========================================================================
    /// MINT - Yeni Pet Oluştur
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Blockchain'de yeni bir Pet nesnesi yaratır ve sahibine gönderir
    /// 
    /// Bu fonksiyon çağrıldığında:
    /// 1. object::new(ctx) → Yeni benzersiz ID oluşturur
    /// 2. Pet struct'ı → Başlangıç değerleriyle doldurulur
    /// 3. transfer::transfer → Pet, işlemi imzalayan kişinin cüzdanına gönderilir
    /// 
    /// 💡 ÖNEMLİ KAVRAM: "Minting" = Blockchain'de yeni dijital varlık yaratma
    /// NFT'ler, tokenlar - hepsi bu şekilde "mint" edilir
    /// 
    #[allow(lint(self_transfer))]
    public entry fun mint(ctx: &mut TxContext) {
        // Yeni Pet oluştur - tıpkı bir hayvanı evlat edinmek gibi!
        let pet = Pet {
            id: object::new(ctx),  // Blockchain'den benzersiz ID al
            hunger: 0,              // Başlangıçta tok (0 = hiç aç değil)
            happiness: 100,         // Başlangıçta çok mutlu
            energy: 100,            // Başlangıçta enerjisi tam
        };
        
        // Pet'i işlemi gönderen kişinin cüzdanına aktar
        // tx_context::sender(ctx) → İşlemi kim imzaladı? Onun adresi
        transfer::transfer(pet, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// FEED - Pet'i Besle
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Açlık değerini azaltır (Pet'i doyurur)
    /// 
    /// 💡 MUTABLE REFERENCE (&mut Pet):
    /// - "&mut" = "Bu nesneyi ödünç al VE değiştir"
    /// - Move'da güvenlik için nesneyi değiştirmek istiyorsan bunu belirtmelisin
    /// - Sadece Pet'in SAHİBİ bu fonksiyonu çağırabilir!
    /// 
    /// 🔒 GÜVENLİK: Blockchain otomatik olarak kontrol eder:
    /// - Bu Pet bu kişiye mi ait? ✓
    /// - Değiştirme izni var mı? ✓ (&mut ile belirtilmiş)
    /// 
    public entry fun feed(pet: &mut Pet) {
        // Açlığı 20 puan azalt (minimum 0)
        // Neden "else 0"? → Çünkü u64 negatif olamaz!
        if (pet.hunger > 20) {
            pet.hunger = pet.hunger - 20;
        } else {
            pet.hunger = 0;  // 20'den az ise doğrudan 0 yap
        };
        // Fonksiyon bittiğinde değişiklikler otomatik kaydedilir
    }

    /// ========================================================================
    /// PLAY - Pet ile Oyna
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Birden fazla stat'ı aynı anda değiştirir
    /// 
    /// Bu fonksiyon "ATOMİKLİK" kavramını gösterir:
    /// - Ya TÜM değişiklikler olur
    /// - Ya da HİÇBİRİ olmaz (işlem başarısız olursa)
    /// 
    /// Oynamanın etkileri:
    /// ✅ Mutluluk +10 (Eğleniyor!)
    /// ⚡ Enerji -10 (Yoruluyor)
    /// 🍖 Açlık +10 (Acıkıyor)
    /// 
    public entry fun play(pet: &mut Pet) {
        // 1. Mutluluk artır (maksimum 100)
        if (pet.happiness + 10 <= MAX_STAT) {
            pet.happiness = pet.happiness + 10;
        } else {
            pet.happiness = MAX_STAT;  // 100'ü geçemez
        };

        // 2. Enerji azalt (minimum 0)
        if (pet.energy > 10) {
            pet.energy = pet.energy - 10;
        } else {
            pet.energy = 0;
        };

        // 3. Açlık artır (egzersiz acıktırır!)
        if (pet.hunger + 10 <= MAX_STAT) {
            pet.hunger = pet.hunger + 10;
        } else {
            pet.hunger = MAX_STAT;
        };
        
        // 🎯 ÖNEMLİ: Bu 3 değişiklik tek bir işlemde gerçekleşir
        // Buna "atomik işlem" denir - bölünemez!
    }

    /// ========================================================================
    /// SLEEP - Pet'i Uyut
    /// ========================================================================
    /// 
    /// 🎯 AMACI: Enerjiyi tamamen yeniler, ama uyurken acıkır
    /// 
    /// Bu fonksiyon basit ama önemli bir pattern gösterir:
    /// - Bazı aksiyonların yan etkileri vardır
    /// - Gerçekçi oyun mekaniği: uyku = enerji ↑ ama açlık da ↑
    /// 
    public entry fun sleep(pet: &mut Pet) {
        // Enerjiyi tamamen yenile
        pet.energy = MAX_STAT;  // 💤 Zzz... Tam dinlenmiş!
        
        // Uyurken biraz acıkır (metabolizma çalışıyor)
        if (pet.hunger + 10 <= MAX_STAT) {
            pet.hunger = pet.hunger + 10;
        } else {
            pet.hunger = MAX_STAT;
        };
    }
}
