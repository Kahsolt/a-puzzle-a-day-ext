/* puzzle definition */
const board = [
  ['一月', '二月', '三月', '四月',   '五月',   '六月',  ''],
  ['七月', '八月', '九月', '十月', '十一月', '十二月',  ''],
  [   '1',   '2',    '3',    '4',     '5',      '6',  '7'],
  [   '8',   '9',   '10',   '11',    '12',     '13', '14'],
  [  '15',  '16',   '17',   '18',    '19',     '20', '21'],
  [  '22',  '23',   '24',   '25',    '26',     '27', '28'],
  [  '29',  '30',   '31', '周日',   '周一',   '周二', '周三'],
  [    '',    '',     '',     '',   '周四',  '周五', '周六'],
];
const board_value = [
  [ 1,  2,  3,  4,  5,  6, -1],
  [ 7,  8,  9, 10, 11, 12, -1],
  [ 1,  2,  3,  4,  5,  6,  7],
  [ 8,  9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 31,  7,  1,  2,  3],
  [-1, -1, -1, -1,  4,  5,  6],
];

const mask_invalid = board.map(row => row.map(x => Number(x == '')));                             // 不可放置块标记为1
const mask_month   = board.map(row => row.map(x => Number(x.endsWith('月'))));                    // 月份块标记为1
const mask_day     = board.map(row => row.map(x => Number(x != '' && !Number.isNaN(Number(x))))); // 日期块标记为1
const mask_week    = board.map(row => row.map(x => Number(x.startsWith('周'))));                  // 星期块标记为1

const pieces = [
  [
    [1, 1, 1, 1],     // ####
  ],
  [
    [1, 1, 1, 1],     // ####
    [1, 0, 0, 0],     // #
  ],
  [
    [0, 1, 1, 1],     //  ###
    [1, 1, 0, 0],     // ##
  ],
  [
    [1, 1, 1],        // ###
    [1, 0, 0],        // #
  ],
  [
    [0, 1, 1],        //  ##
    [1, 1, 0],        // ##
  ],
  [
    [1, 1, 1],        // ###
    [1, 0, 1],        // # #
  ],
  [
    [1, 1, 1],        // ###
    [1, 1, 0],        // ##
  ],
  [
    [1, 1, 1],        // ###
    [1, 0, 0],        // #
    [1, 0, 0],        // #
  ],
  [
    [1, 1, 1],        // ###
    [0, 1, 0],        //  #
    [0, 1, 0],        //  #
  ],
  [
    [0, 1, 1],        //  ##
    [0, 1, 0],        //  #
    [1, 1, 0],        // ##
  ]
];

/* utils */
function StringBuilder() { this._stringArray = new Array(); }
StringBuilder.prototype.reset = function() { this._stringArray.length = 0; }
StringBuilder.prototype.append = function(str) { this._stringArray.push(str); }
StringBuilder.prototype.toString = function(sep='') { return this._stringArray.join(sep); }
const sb = new StringBuilder();

function Array2d() { }
Array2d.prototype.new = function(h, w) {
  return Array.from(Array(h), () => new Array(w));
}
Array2d.prototype.copy = function(A) {
  let h = A.length, w = A[0].length;
  let B = Array2d.prototype.new(h, w);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      B[i][j] = A[i][j];
  return B;
}
Array2d.prototype.add = function(A, B) {
  Array2d.prototype.assert_shape_match(A, B);
  let h = A.length, w = A[0].length;
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      A[i][j] += B[i][j];
  return A;
}
Array2d.prototype.assert_shape_match = function(A, B) {
  let h = A.length, hh = B.length;
  let w = A[0].length, ww = B[0].length;
  if (h != hh || w != ww)
    console.log("[Error] shape mismatch of A[" + h + "," + w + "] and B[" + hh + "," + ww + "]");
}
Array2d.prototype.equal = function(A, B) {
  Array2d.prototype.assert_shape_match(A, B);
  let h = A.length, w = A[0].length;
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (A[i][j] != B[i][j])
        return false;
  return true;
}
Array2d.prototype.rotate = function(A) {
  let h = A.length, w = A[0].length;
  let B = Array2d.prototype.new(w, h);
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++)
      B[i][j] = A[j][w - i - 1];
  return B;
}
Array2d.prototype.mirror = function(A) {
  let h = A.length, w = A[0].length;
  let B = Array2d.prototype.new(h, w);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      B[i][j] = A[i][w - j - 1];
  return B;
}
const Grid = new Array2d();

/* puzzle solver */
function init_variations() {
  function check_in(newpiece, variations) {
    let h = newpiece.length, w = newpiece[0].length;
    for (let i in variations) {
      let piece = variations[i];
      let hh = piece.length, ww = piece[0].length;
      if (h != hh || w != ww) continue;
      if (Grid.equal(newpiece, piece)) return true;
    }
    return false;
  }

  let variations = Array.from(Array(pieces.length), () => new Array());
  for (let i = 0; i < pieces.length; i++) {
    let piece = pieces[i];
    variations[i].push(piece);

    // rotate
    let newpiece = piece;
    for (let k = 0; k < 4; k++) {
      newpiece = Grid.rotate(newpiece);
      if (!check_in(newpiece, variations[i]))
        variations[i].push(newpiece);
    }

    // mirror & rotate
    newpiece = Grid.mirror(piece);
    for (let k = 0; k < 4; k++) {
      newpiece = Grid.rotate(newpiece);
      if (!check_in(newpiece, variations[i]))
        variations[i].push(newpiece);
    }
  }
  return variations;
}

const variations = init_variations()
console.log('Defined ' + variations.length + ' puzzle pieces in total');
sb.reset();
for (let i in variations) sb.append(' ' + variations[i].length)
console.log('Variations for each pieces:' + sb.toString());

function make_blank() {   // 可放置块标记为0
  return Grid.copy(mask_invalid); 
}

function make_target_today() {
  let now   = new Date();
  let month = now.getMonth() + 1;
  let day   = now.getDate();
  let week  = (now.getDay() + 6) % 7 + 1;
  console.log("Target: month=" + month + ", date=" + day + ", weekday=" + week);
  return make_target(month, day, week)
}

function make_target(month, day, week) {  // 仅指定日期的三块标记为0
  let target = make_blank();
  let h = target.length, w = target[0].length;

  let month_target = Grid.copy(mask_month);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (month_target[i][j] == 1 && board_value[i][j] == month)
        { month_target[i][j] = 0; break; }
  target = Grid.add(target, month_target);

  let day_target = Grid.copy(mask_day);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (day_target[i][j] == 1 && board_value[i][j] == day)
        { day_target[i][j] = 0; break; }
  target = Grid.add(target, day_target);

  let week_target = Grid.copy(mask_week);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (week_target[i][j] == 1 && board_value[i][j] == week)
        { week_target[i][j] = 0; break; }
  target = Grid.add(target, week_target);

  let zerocnt = 0;
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (target[i][j] == 0)
        zerocnt += 1;
  if (zerocnt != 3)
    console.log("[make_target] bad target, blank cell count is not exactly 3");

  return target;
}

function print_grid(grid) {
  let h = grid.length, w = grid[0].length;
  sb.reset();
  for (let i = 0; i < h; i++) {
    sb.append('|');
    for (let j = 0; j < w; j++) {
      if (grid[i][j] == -1) s = 'x';
      else if (grid[i][j] == 0) s = ' ';
      else s = Number(grid[i][j]) - 1;
      sb.append(' ' + s + ' |');
    }
    sb.append('\n');
  }
  console.log(sb.toString());
}

function DFS(current, target, v, solutions) {
  if (v == variations.length) {
    solutions.push(current);
    print_grid(current);
    return;
  }

  let h = current.length, w = current[0].length;
  // 对于一块拼图的各种变形方式
  for (let k in variations[v]) {
    let piece = variations[v][k];   
    let hh = piece.length, ww = piece[0].length;

    // 尝试把它放在棋盘的每个地方
    for (let r = 0; r <= h - hh; r++)
      for (let c = 0; c <= w - ww; c++) {
        // 检查：重叠冲突
        let chk = true;
        for (let rr = r; rr < r + hh && chk; rr++)
          for (let cc = c; cc < c + ww && chk; cc++)
            if (piece[rr-r][cc-c] == 1 && (current[rr][cc] != 0 || target[rr][cc] == 0))
              chk = false;
        if (!chk) continue;
        
        // 拼入
        for (let rr = r; rr < r + hh; rr++)
          for (let cc = c; cc < c + ww; cc++)
            if (piece[rr-r][cc-c])
              current[rr][cc] = 1 + Number(v);    // 拼图块编号1~10

        // 递归
        DFS(current, target, v + 1, solutions);

        // 还原
        for (let rr = r; rr < r + hh; rr++)
          for (let cc = c; cc < c + ww; cc++)
            if (piece[rr-r][cc-c])
              current[rr][cc] = 0;
      }
  }
}

function solve(target) {
  let current = make_blank().map(row => row.map(x => -x));  // -1表示不可填充，0表示待填充
  let solutions = new Array();                              // 存放结果

  DFS(current, target, 0, solutions);
  return solutions;
}

/* CUI main */
if (1) {
  console.log("board");        print_grid(board);
  //console.log("mask_invalid"); print_grid(mask_invalid);
  //console.log("mask_month");   print_grid(mask_month);
  //console.log("mask_day");     print_grid(mask_day);
  //console.log("mask_week");    print_grid(mask_week);
  //let blank  = make_blank();
  //console.log("blank");                  print_grid(blank);

  let target = make_target_today();
  console.log("target");                 print_grid(target);
  //console.log("board masked by target"); print_grid(board, target);

  let solutions = solve(target);
  console.log('[solve] found ' + solutions.length + ' solutions:');
  for (let i in solutions)
    print_grid(solutions[i]);
}
