# Marmitaria da Diih - Cardápio Digital

Este projeto é um aplicativo web progressivo (PWA) construído com React, Vite e Firebase.

## Pré-requisitos

1.  Node.js instalado.
2.  Conta no Firebase.
3.  Firebase CLI instalado (`npm install -g firebase-tools`).

## Configuração

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Configure o Firebase:**
    -   Crie um arquivo `.env` na raiz do projeto com suas credenciais (veja `.env.example`).
    -   Certifique-se de que o Firestore e Storage estão habilitados no console do Firebase.

## Integração com Supabase (Opcional)

Este projeto também suporta Supabase como backend alternativo ao Firebase.

1.  **Crie um projeto no Supabase:**
    -   Acesse https://supabase.com/ e crie um novo projeto.

2.  **Configure as variáveis de ambiente:**
    -   No `.env`, adicione:
        ```env
        VITE_SUPABASE_URL=sua_url_do_supabase
        VITE_SUPABASE_ANON_KEY=sua_anon_key
        ```

3.  **Crie as tabelas no Banco de Dados (SQL Editor):**
    Execute o seguinte script SQL no painel do Supabase:

    ```sql
    -- Tabela de Categorias
    create table categories (
      id text primary key default uuid_generate_v4(),
      name text not null,
      active boolean default true
    );

    -- Tabela de Itens do Menu
    create table "menuItems" (
      id text primary key default uuid_generate_v4(),
      "categoryId" text references categories(id),
      name text not null,
      description text,
      price numeric,
      images text[],
      "optionGroups" jsonb,
      available boolean default true
    );

    -- Tabela de Configurações (Singleton)
    create table settings (
      id text primary key,
      name text,
      phone text,
      "whatsappNumber" text,
      address text,
      logo text,
      banner text,
      "instagramUrl" text,
      "facebookUrl" text,
      "adminPassword" text,
      "pixKey" text,
      "pixKeyType" text,
      "pixName" text,
      "pixCity" text,
      "businessHours" text,
      delivery jsonb,
      style jsonb,
      notice jsonb
    );

    -- Tabela de Pedidos
    create table orders (
      id text primary key default uuid_generate_v4(),
      "customerName" text,
      items jsonb,
      total numeric,
      status text,
      "createdAt" timestamptz default now(),
      "paymentMethod" text,
      address text,
      neighborhood text,
      number text,
      "changeFor" text,
      notes text,
      "needCutlery" text,
      "deliveryFee" numeric
    );

    -- Habilitar Realtime
    alter publication supabase_realtime add table categories, "menuItems", settings, orders;
    ```

4.  **Configure o Storage:**
    -   Crie um bucket público chamado `images`.
    -   Adicione uma política de acesso (Policy) para permitir leitura pública e upload (para testes, permita tudo ou restrinja conforme necessário).

5.  **Prioridade:**
    -   Se as chaves do Supabase estiverem configuradas, o app usará o Supabase.
    -   Caso contrário, tentará usar o Firebase.
    -   Se nenhum estiver configurado, usará modo local (apenas leitura/memória).

## Como fazer o Deploy no Firebase Hosting

1.  **Configure o ID do Projeto:**
    -   Abra o arquivo `.firebaserc` e substitua `"YOUR_PROJECT_ID"` pelo ID do seu projeto no Firebase.

2.  **Faça login no Firebase:**
    ```bash
    npx firebase login
    ```

3.  **Faça o deploy (Build + Upload):**
    ```bash
    npm run deploy
    ```
    Este comando irá automaticamente gerar a versão de produção (`npm run build`) e enviar para o Firebase Hosting.

4.  **Verifique se as regras de segurança estão corretas:**
    -   O arquivo `firestore.rules` e `storage.rules` estão configurados para permitir leitura/escrita pública (modo de desenvolvimento).
    -   Para produção, configure a autenticação no Firebase Console e ajuste as regras conforme necessário.

## Funcionalidades PWA

O aplicativo está configurado para ser instalável em dispositivos móveis.
-   Ícone na tela inicial.
-   Tela de splash.
-   Funciona offline (cache básico).

Para personalizar o ícone, adicione `pwa-192x192.png` e `pwa-512x512.png` na pasta `public/` antes de fazer o build.
