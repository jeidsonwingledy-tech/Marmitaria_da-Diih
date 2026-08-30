import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// --- INSTRUÇÕES ---
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto (ou selecione um existente).
// 3. No menu lateral, vá em "Criação" -> "Firestore Database" e clique em "Criar banco de dados" (escolha modo de teste).
// 4. No menu lateral, vá em "Criação" -> "Storage" e clique em "Começar" (modo de teste).
// 5. Volte para a "Visão geral do projeto" (ícone da engrenagem -> Configurações do projeto).
// 6. Role até "Seus aplicativos", clique no ícone web (</>), registre o app.
// 7. Copie o objeto 'firebaseConfig' que aparecerá e substitua o objeto abaixo inteiramente.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "COLE_SUA_API_KEY_AQUI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "seu-projeto.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "seu-projeto",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "seu-projeto.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Inicialização
let app;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
    // Verifica se o usuário configurou as chaves reais
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log("🔥 Firebase conectado com sucesso!");
    } else {
        console.warn("⚠️ ATENÇÃO: Chaves do Firebase não configuradas.");
        console.warn("Edite o arquivo 'services/firebase.ts' e cole suas credenciais.");
    }
} catch (error) {
    console.error("Erro crítico ao inicializar Firebase:", error);
}

export { db, storage };