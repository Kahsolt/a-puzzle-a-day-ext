// Author: Armit 
// Create Time: 2022/08/27
// Update Time: 2022/09/26 

// Usage:
//   node.exe solver.js
//   node.exe solver.js 11 45 14

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
Array2d.prototype.equal = function(A, B) {
  let h = A.length, hh = B.length;
  let w = A[0].length, ww = B[0].length;
  if (h != hh || w != ww) return false;

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

/* perfcount */
var ts_start;      // ts from dfs() start
var ts_last;       // ts from last solution found

/* readable name mapping */
const MN = [ '', 
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];
const DN = [ '', 
  '1日', '2日', '3日', '4日', '5日', '6日', '7日', '8日', '9日', '10日',
  '11日', '12日', '13日', '14日', '15日', '16日', '17日', '18日', '19日', '20日',
  '21日', '22日', '23日', '24日', '25日', '26日', '27日', '28日', '29日', '30日',
  '31日',
];
const WN = [ '', 
  '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日',
];

/* board definition */
const M = 1, D = 2, W = 3, _ = 0;
const board_type = [
  [ M, M, M, M, M, M, _ ],
  [ M, M, M, M, M, M, _ ],
  [ D, D, D, D, D, D, D ],
  [ D, D, D, D, D, D, D ],
  [ D, D, D, D, D, D, D ],
  [ D, D, D, D, D, D, D ],
  [ D, D, D, W, W, W, W ],
  [ _, _, _, _, W, W, W ],
];
const board_value = [
  [  1,  2,  3,  4,  5,  6,  0 ],
  [  7,  8,  9, 10, 11, 12,  0 ],
  [  1,  2,  3,  4,  5,  6,  7 ],
  [  8,  9, 10, 11, 12, 13, 14 ],
  [ 15, 16, 17, 18, 19, 20, 21 ],
  [ 22, 23, 24, 25, 26, 27, 28 ],
  [ 29, 30, 31,  7,  1,  2,  3 ],
  [  0,  0,  0,  0,  4,  5,  6 ],
];
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
].sort(() => .5 - Math.random());   // randomize!
function init_variations() {
  function check_in(newpiece, variations) {
    for (let i in variations)
      if (Grid.equal(newpiece, variations[i]))
        return true;
    return false;
  }

  let variations = Grid.new(pieces.length, 0);
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

/* puzzle solver */
function make_target_and_mask(m, d, w) {
  let nrow = board_value.length, ncol = board_value[0].length;
  let target = Grid.new(nrow, ncol), mask = Grid.new(nrow, ncol);

  for (let i = 0; i < nrow; i++)
    for (let j = 0; j < ncol; j++) {
      mask[i][j] = board_value[i][j] ? 0 : -1;
      switch (board_type[i][j]) {
        case M: target[i][j] = m != board_value[i][j]; break;
        case D: target[i][j] = d != board_value[i][j]; break;
        case W: target[i][j] = w != board_value[i][j]; break;
        case _: target[i][j] = -1; break;
      }
    }

  return {target: target, mask: mask};
}
function print_grid(grid, name='') {
  if (name) console.log('[' + name + ']');

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

function* dfs(mask, target, v, by_step=false) {
  if (v == variations.length) {
    now = Date.now();
    console.log('>> new solution in ' + Number((now - ts_last) / 1000) + ' sec');
    ts_last = now;
    if (by_step) yield { board: mask, is_solution: true };
    else yield mask;
  }

  let h = mask.length, w = mask[0].length;

  // 检查：形成了单元孤岛
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (mask[i][j] == 0) {    // 当前块是空地
        if (target[i][j] == 0) continue;  // 如果目标也是空地那就满足条件，不管

        let N = i - 1  < 0 || mask[i - 1][j] > 0;
        let S = i + 1 >= h || mask[i + 1][j] > 0;
        let W = j - 1  < 0 || mask[i][j - 1] > 0;
        let E = j + 1 >= w || mask[i][j + 1] > 0;
        if (N && S && W && E) return;     // 上下左右都已经填充
      }

  // 对于一块拼图的各种变形方式
  for (let k in variations[v]) {
    let piece = variations[v][k];   
    let hh = piece.length, ww = piece[0].length;

    // 尝试把它放在棋盘的每个地方
    for (let r = 0; r <= h - hh; r++)
      for (let c = 0; c <= w - ww; c++) {
        // 检查：重叠冲突 & 目标被遮盖
        let chk = true;
        for (let rr = r; rr < r + hh && chk; rr++)
          for (let cc = c; cc < c + ww && chk; cc++)
            if (piece[rr-r][cc-c] == 1 && (mask[rr][cc] != 0 || target[rr][cc] == 0))
              chk = false;
        if (!chk) continue;
        
        // 拼入
        let code = 1 + Number(v);
        for (let rr = r; rr < r + hh; rr++)
          for (let cc = c; cc < c + ww; cc++)
            if (piece[rr-r][cc-c])
              mask[rr][cc] = code;    // 拼图块编号1~10
        if (by_step) yield { board: mask, is_solution: false };

        // 递归
        yield* dfs(mask, target, v + 1, by_step);

        // 还原
        for (let rr = r; rr < r + hh; rr++)
          for (let cc = c; cc < c + ww; cc++)
            if (piece[rr-r][cc-c])
              mask[rr][cc] = 0;
        if (by_step) yield { board: mask, is_solution: false };
      }
  }
}
function* solve(month, day, week, by_step=false) {
  let R = make_target_and_mask(month, day, week);
  print_grid(R.target, 'target');
  
  ts_start = ts_last = Date.now();
  yield* dfs(R.mask, R.target, 0, by_step);
}

/* main entry */
if (typeof window === 'undefined') {    // only run in CUI
  // parse args
  argc = process.argv.length;
  if (argc == 2) {          // today
    let now = new Date();
    m = now.getMonth() + 1;
    d = now.getDate();
    w = (now.getDay() + 6) % 7 + 1;
  } else if (argc == 5) {   // certain day
    m = Number(process.argv[2]);
    d = Number(process.argv[3]);
    w = Number(process.argv[4]);
  } else {
    console.log('Usage: ');
    console.log('   node.exe solver.js');
    console.log('   node.exe solver.js <month> <date> <weekday>');
    process.exit(-1);
  }

  // check target
  if (!(1 <= m && m <= 12 && 1 <= d && d <= 31 && 1 <= w && w <= 7)) {
    console.log('[Error] invalid target!');
    process.exit(-2);
  }

  // rush B!!
  console.log('[Solver] search solutions for: ' + MN[m] + DN[d] + ' ' + WN[w]);
  for (let solut of solve(m, d, w))     // SYNTAX: `for (it of gen)`
    print_grid(solut, 'solution');
  
  console.log('>> done in ' + Number((Date.now() - ts_start) / 10) + ' sec');
}