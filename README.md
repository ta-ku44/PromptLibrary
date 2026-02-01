# Prompt Library

**Prompt Library** は、ChatGPT、Claude、Gemini、Grok などの生成AIで**よく使うプロンプトを効率的に再利用できるChrome拡張機能**です。  
入力欄にコマンドトリガー（デフォルト：`#`）を入力すると、プロンプト一覧がサジェスト表示され、選択したプロンプトが即座に挿入されます。

## 主な機能

- **テンプレート管理**: よく使うプロンプトを保存し、カテゴリで整理
- **プロンプトの挿入**: コマンドトリガーでプロンプトを即座に挿入
- **入力変数**: `{{変数名}}` 形式で動的な入力欄を作成可能

## インストール

### Chrome ウェブストア経由

1. [Prompt Library - Chrome ウェブストア](#) にアクセス
2. 「ブラウザに追加」をクリック
3. 拡張機能アイコンから設定を開き、テンプレートを作成

## 使い方

### 1. テンプレートを作成する

1. 拡張機能のオプションページを開く  
2. カテゴリ内の「新規テンプレート作成」を選択  
3. 以下を設定：
   - **タイトル**: テンプレート名
   - **内容**: プロンプト本文（変数は `{{説明}}` の形式で記述）
4. 保存

### 2. プロンプトを挿入する

1. 対応サイトの入力欄でコマンドトリガー（`#`）を入力  
2. 表示されるサジェストからテンプレートを選択  
3. 変数がある場合は値を入力  
4. 必要に応じて編集し、送信

### 3. テンプレートを管理する

オプションページから以下の操作が可能：
- テンプレートの編集・削除
- カテゴリの追加・変更
- 表示順の調整

## 対応サイト

| サイト名 | URL |
| ---- | ---- |
| ChatGPT | https://chatgpt.com/ |
| Claude | https://claude.ai/ |
| Gemini | https://gemini.google.com/ |
| NotebookLM | https://notebooklm.google.com/ |
| Grok | https://grok.com/ |
| Copilot | https://copilot.microsoft.com/ |
| Github Copilot | https://copilot.github.com/ |
| Genspark | https://genspark.ai/ |
| DeepSeek | https://chat.deepseek.com/ |

### 現在未対応

以下のサイトはリッチテキストエディタの仕様により未対応です（今後のアップデートで対応予定）：
- Perplexity
- Notion AI

## 今後のアップデート予定

- Popup機能の追加（トリガーキーの変更・テーマの切り替え・対応サイトごとの有効/無効切り替え）
- 対応サイトの追加
- オプション画面のUI改善と機能拡充

## フィードバック・問題報告

不具合や機能要望は [GitHub Issues](https://github.com/ta-ku44/PromptLibrary/issues) までお願いします。