# 像素桌面寵物 🐱🐶

2D 像素風的寵物住在你的桌面上：一隻貓咪和一隻西施犬，會在工作列上方走來走去、發呆、睡覺。
點牠們一下，頭上就會跳出對話框，貓咪喵喵叫、西施犬汪汪叫。

## 執行

需要 [Node.js](https://nodejs.org/)（18 以上）。

```bash
npm install
npm start
```

想先看看樣子、不想裝 Electron：直接用瀏覽器打開 `renderer/index.html`（貓咪）或 `renderer/index.html?pet=shihtzu`（西施犬），會進入「預覽模式」，網頁本身就是桌面。

## 打包成 .exe

```bash
npm install
npm run dist
```

會產生 `dist/PixelCat-0.3.2-portable.exe`：單一執行檔，不用安裝，點兩下就跑。
在 Linux / macOS 上也能打包 Windows 版，不需要 Wine：圖示和版本資訊由 `scripts/after-pack.js`（用 [resedit](https://github.com/jet2jet/resedit-js)）寫進 exe。

執行檔沒有數位簽章，第一次開啟時 Windows 可能跳出「Windows 已保護您的電腦」，按「其他資訊 → 仍要執行」即可。
portable 版每次啟動都要先解壓，會慢個幾秒。

## 怎麼玩

兩隻寵物各自獨立：各有自己的視窗、位置、飽足度、心情和顏色。

| 操作 | 效果 |
| --- | --- |
| 左鍵點寵物 | 叫一聲、冒愛心，心情 +4 |
| 拖曳寵物 | 把牠抓起來，放開會掉回地面 |
| 右鍵點寵物 | 選單：看飽足度/心情、餵食、陪玩、睡覺/叫醒、換顏色、顯示另一隻、收起這隻、置頂、離開 |
| 系統匣圖示 | 勾選要顯示哪幾隻、叫大家回來（跑不見時用）、離開 |

收起的寵物會記住，下次開啟時還是收起的；從系統匣勾回來就會出現。

### 顏色

右鍵 → 顏色，選好的顏色會記住。

- **貓咪** 8 種：橘貓、灰貓、黑貓（黃眼睛）、白貓（藍眼睛）、奶油貓、咖啡貓、粉紅貓、藍貓
- **西施犬**（短毛造型）6 種：米白灰耳（預設）、金白、棕白、黑白、銀白、全白

### 養成

- **飽足度**：每分鐘 -1。餵食 +35，太飽（90 以上）會拒吃。低於 30 會走得比較慢，還會喊餓。
- **心情**：每 45 秒 -1。摸摸 +4、陪玩 +25（會消耗 5 點飽足度）。低於 30 會討拍。
- 關掉程式後數值會保存，再開時會依離開的時間扣一些（速度是平常的一半）。

存檔位置（Windows）：`%APPDATA%\PixelCat\` 裡的 `cat-state.json`、`shihtzu-state.json`、`settings.json`。

## 專案結構

```
main.js              Electron 主程式：每隻寵物一個透明、無邊框、置頂的小視窗，系統匣、右鍵選單、存檔
preload.js           主程式與畫面之間的安全橋接（window.catApi）
renderer/
  index.html         畫面（?pet=cat 或 ?pet=shihtzu 決定是哪一隻）
  style.css          對話框、預覽模式樣式
  sprites.js         各寵物的像素圖、顏色、尾巴動畫、台詞（每個字元一個像素）
  app.js             動畫、行為狀態機、養成數值、滑鼠操作（兩隻共用）
scripts/
  check-sprites.js   檢查像素圖每列寬度與顏色（npm run check）
  make-icon.js       由貓咪頭像產生 assets/ 與 build/ 裡的圖示（npm run icon）
  after-pack.js      打包時把圖示與版本資訊寫進 PixelCat.exe
build/
  icon.ico, icon.png exe 用的圖示
```

### 改造寵物

每隻寵物在 `renderer/sprites.js` 裡是一個物件（`cat`、`shihtzu`）：

- `COLORS`：顏色清單，照格式多加一筆就會出現在右鍵選單裡
- `*_TAILS` 與 `tailAnims`：尾巴的姿勢與播放順序
- `lines`：各種情況說的話

**想再加第三隻**：在 `sprites.js` 照 `shihtzu` 的格式新增一個物件並放進 `species`，再到 `main.js` 的 `PETS` 加一行。

修改像素圖後跑 `npm run check` 確認沒有畫歪，再跑 `npm run icon` 更新圖示。

## 小提醒

- 視窗透明的地方滑鼠可以穿過去點到後面的桌面（Windows、macOS）。Linux 不支援這個功能，寵物周圍那一小塊會擋住滑鼠。
- 改了程式要重新 `npm run dist` 才會反映到 exe。
