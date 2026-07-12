import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import warnings

warnings.filterwarnings('ignore')

# Synthetic Training Data
# Features: "industry | business_type | goals"
# Target: List of operational tabs
SYNTHETIC_DATA = [
    {
        "industry": "Restoran",
        "business_type": "urun",
        "goals": "Müşteri bulmak, Paket servis",
        "tabs": ["menu", "siparis", "kasa", "icerik", "crm"]
    },
    {
        "industry": "Kafe",
        "business_type": "urun",
        "goals": "Bilinirlik, Marka",
        "tabs": ["menu", "siparis", "kasa", "google_business", "icerik"]
    },
    {
        "industry": "Berber / Kuaför",
        "business_type": "hizmet",
        "goals": "Randevu almak, Müşteri sadakati",
        "tabs": ["randevu", "crm", "personel", "kasa"]
    },
    {
        "industry": "Güzellik Salonu",
        "business_type": "hizmet",
        "goals": "Yeni müşteriler, Randevu",
        "tabs": ["randevu", "crm", "icerik", "kasa", "personel"]
    },
    {
        "industry": "Yazılım Ajansı",
        "business_type": "hizmet",
        "goals": "B2B Müşteri, Kurumsal İletişim",
        "tabs": ["crm", "is_akisi", "google_business", "personel"]
    },
    {
        "industry": "Oto Sanayi / Tamir",
        "business_type": "ikisi",
        "goals": "Randevu almak, Parça satışı",
        "tabs": ["randevu", "is_akisi", "kasa", "crm"]
    },
    {
        "industry": "İnşaat / Mimarlık",
        "business_type": "hizmet",
        "goals": "Büyük projeler, Kurumsal ağ",
        "tabs": ["is_akisi", "crm", "personel", "icerik"]
    },
    {
        "industry": "Fabrika / Üretim",
        "business_type": "urun",
        "goals": "Üretim kapasitesi, Tekrarlayan sipariş",
        "tabs": ["is_akisi", "siparis", "kasa", "crm"]
    },
    {
        "industry": "E-Ticaret",
        "business_type": "urun",
        "goals": "Satış, Reklam",
        "tabs": ["siparis", "kasa", "icerik", "crm"]
    },
    {
        "industry": "Danışmanlık",
        "business_type": "hizmet",
        "goals": "Toplantı, Kurumsal müşteri",
        "tabs": ["randevu", "crm", "icerik", "is_akisi"]
    },
    {
        "industry": "Boutique / Giyim",
        "business_type": "urun",
        "goals": "Bilinirlik, Satış",
        "tabs": ["menu", "siparis", "kasa", "icerik"]
    },
    {
        "industry": "Spor Salonu",
        "business_type": "hizmet",
        "goals": "Üyelik satışı, Randevu",
        "tabs": ["randevu", "crm", "kasa", "personel"]
    },
    {
        "industry": "Kuaför & Güzellik Salonu",
        "business_type": "hizmet",
        "goals": "Randevu, Müşteri sadakati, İçerik",
        "tabs": ["randevu", "crm", "icerik", "kasa", "personel", "google_business"]
    },
    {
        "industry": "Restoran & Lokanta",
        "business_type": "urun",
        "goals": "Paket servis, Yeni müşteri, Menü",
        "tabs": ["menu", "siparis", "kasa", "icerik", "crm", "google_business"]
    },
    {
        "industry": "Makine ve Yedek Parça Üretimi",
        "business_type": "urun",
        "goals": "B2B sipariş, Kapasite, CRM",
        "tabs": ["is_akisi", "siparis", "kasa", "crm", "personel"]
    },
    {
        "industry": "Gayrimenkul & Emlak",
        "business_type": "hizmet",
        "goals": "Portföy, Randevu, Lead",
        "tabs": ["crm", "randevu", "icerik", "google_business", "is_akisi"]
    },
    {
        "industry": "Giyim, Tekstil & Butik",
        "business_type": "urun",
        "goals": "Satış, Sosyal medya, Stok",
        "tabs": ["menu", "siparis", "kasa", "icerik", "crm"]
    },
]

class TabPredictorML:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=100)
        self.mlb = MultiLabelBinarizer()
        self.classifier = RandomForestClassifier(n_estimators=50, random_state=42)
        self.is_trained = False
        
    def train(self):
        texts = []
        labels = []
        
        # Data Augmentation (duplicating and slightly tweaking for robust TF-IDF)
        for _ in range(5): 
            for item in SYNTHETIC_DATA:
                combined_text = f"{item['industry']} {item['business_type']} {item['goals']}"
                texts.append(combined_text)
                labels.append(item['tabs'])
                
        # Fit vectorizer
        X = self.vectorizer.fit_transform(texts)
        # Fit binarizer
        y = self.mlb.fit_transform(labels)
        
        # Train classifier
        self.classifier.fit(X, y)
        self.is_trained = True
        print(f"TabPredictorML trained successfully with {len(texts)} samples.")
        
    def predict(self, industry: str, business_type: str, goals: list) -> list:
        if not self.is_trained:
            self.train()
            
        goals_text = " ".join(goals) if goals else ""
        text = f"{industry} {business_type} {goals_text}"
        
        X_test = self.vectorizer.transform([text])
        y_pred = self.classifier.predict(X_test)
        
        predicted_tabs = self.mlb.inverse_transform(y_pred)
        if predicted_tabs and len(predicted_tabs[0]) > 0:
            return list(predicted_tabs[0])
            
        # Fallback to basic tabs if prediction is completely empty
        if business_type == "urun":
            return ["siparis", "kasa", "crm"]
        else:
            return ["randevu", "crm", "icerik"]

# Global singleton
tab_predictor_model = TabPredictorML()
# Train on startup
tab_predictor_model.train()
