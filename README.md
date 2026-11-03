# 像素桌面貓 🐱

一隻 2D 像素風的貓咪，住在你的桌面上：牠會在工作列上方走來走去、發呆、睡覺。
點牠一下，頭上就會跳出對話框喵喵叫。

## 執行

需要 [Node.js](https://nodejs.org/)（18 以上）。

```bash
npm install
npm start
```

想先看看樣子、不想裝 Electron：直接用瀏覽器打開 `renderer/index.html`，會進入「預覽模式」，網頁本身就是桌面。

## 怎麼玩

| 操作 | 效果 |
| --- | --- |
| 左鍵點貓咪 | 喵喵叫、冒愛心，心情 +4 |
| 拖曳貓咪 | 把牠抓起來，放開會掉回地面 |
| 右鍵點貓咪 | 選單：看飽足度/心情、餵食、陪玩、睡覺/叫醒、置頂、離開 |
| 系統匣圖示 | 叫貓咪回來（跑不見時用）、離開 |

### 養成

- **飽足度**：每分鐘 -1。餵食 +35，太飽（90 以上）會拒吃。低於 30 會走得比較慢，還會喊餓。
- **心情**：每 45 秒 -1。摸摸 +4、陪玩 +25（會消耗 5 點飽足度）。低於 30 會討拍。
- 關掉程式後數值會保存，再開時會依離開的時間扣一些（速度是平常的一半）。

存檔位置：Electron 的 userData 資料夾內的 `cat-state.json`（Windows 是 `%APPDATA%\pixel-desktop-cat\`）。

## 專案結構

```
main.js              Electron 主程式：透明、無邊框、置頂的小視窗，系統匣、右鍵選單、存檔
preload.js           主程式與畫面之間的安全橋接（window.catApi）
renderer/
  index.html         畫面
  style.css          對話框、預覽模式樣式
  sprites.js         像素圖（每個字元一個像素）
  app.js             動畫、行為狀態機、養成數值、滑鼠操作
scripts/
  check-sprites.js   檢查像素圖每列寬度與顏色（npm run check）
  make-icon.js       由貓咪頭像產生 assets/icon.png、assets/tray.png（npm run icon）
```

### 改造貓咪

`renderer/sprites.js` 的 `PALETTE` 決定顏色，換成灰色或黑色就是另一隻貓。
修改像素圖後跑 `npm run check` 確認沒有畫歪，再跑 `npm run icon` 更新圖示。

## 小提醒

- 視窗透明的地方滑鼠可以穿過去點到後面的桌面（Windows、macOS）。Linux 不支援這個功能，貓咪周圍那一小塊會擋住滑鼠。
- 要做成可直接執行的 `.exe`，可以再加上 [electron-builder](https://www.electron.build/) 打包。
