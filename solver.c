// Author: Armit 
// UpdateTime: 2022/09/24 

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include <time.h>

// solver target
int m = 0;       // 1~12
int d = 0;       // 1~31
int w = 0;       // 1~7

// debug or perfcount
char* bin;
bool debug = false;   // whether show genegrated piece variations
int B_WIDTH = 8;      // block width in display
time_t ts_start;      // ts from DFS() start
time_t ts_last;       // ts from last solution found

// readable name mapping
char* MN[] = { "", 
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
};
char* DN[] = { "", 
  "1日", "2日", "3日", "4日", "5日", "6日", "7日", "8日", "9日", "10日",
  "11日", "12日", "13日", "14日", "15日", "16日", "17日", "18日", "19日", "20日",
  "21日", "22日", "23日", "24日", "25日", "26日", "27日", "28日", "29日", "30日",
  "31日",
};
char* WN[] = { "", 
  "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日",
};

// board definition
const int nrow = 8;
const int ncol = 7;
typedef int board_t[8][7];      // C even NOT support const-var as array-length :(
enum BoardType { M, D, W, _ };
board_t board_type = {
  { M, M, M, M, M, M, _ },
  { M, M, M, M, M, M, _ },
  { D, D, D, D, D, D, D },
  { D, D, D, D, D, D, D },
  { D, D, D, D, D, D, D },
  { D, D, D, D, D, D, D },
  { D, D, D, W, W, W, W },
  { _, _, _, _, W, W, W },
};
board_t board_value = {
  {  1,  2,  3,  4,  5,  6,  0 },
  {  7,  8,  9, 10, 11, 12,  0 },
  {  1,  2,  3,  4,  5,  6,  7 },
  {  8,  9, 10, 11, 12, 13, 14 },
  { 15, 16, 17, 18, 19, 20, 21 },
  { 22, 23, 24, 25, 26, 27, 28 },
  { 29, 30, 31,  7,  1,  2,  3 },
  {  0,  0,  0,  0,  4,  5,  6 },
};
board_t mask = { 0 };           // aka. current partial solution; value v indicates the v-th piece is placed (index from 1), 0 for blank, -1 for invalid
board_t target = { 0 };         // 1 for masked, 0 for blank, -1 for invalid

// piece definition
const int npieces = 10;
typedef struct _piece_t {
  int row, col;
  bool* block;                  // store as 1d-array
  struct _piece_t *next;
} piece_t;
bool p0[] = {
  1, 1, 1, 1
};
bool p1[] = {
  1, 1, 1, 1,
  1, 0, 0, 0,
};
bool p2[] = {
  0, 1, 1, 1,
  1, 1, 0, 0,
};
bool p3[] = {
  1, 1, 1,
  1, 0, 0,
};
bool p4[] = {
  0, 1, 1,
  1, 1, 0,
};
bool p5[] = {
  1, 1, 1,
  1, 0, 1,
};
bool p6[] = {
  1, 1, 1,
  1, 1, 0,
};
bool p7[] = {
  1, 1, 1,
  1, 0, 0,
  1, 0, 0,
};
bool p8[] = {
  1, 1, 1,
  0, 1, 0,
  0, 1, 0,
};
bool p9[] = {
  0, 1, 1,
  0, 1, 0,
  1, 1, 0,
};
piece_t proto[] = {             // piece prototypes
  {1, 4, p0, NULL},
  {2, 4, p1, NULL},
  {2, 4, p2, NULL},
  {2, 3, p3, NULL},
  {2, 3, p4, NULL},
  {2, 3, p5, NULL},
  {2, 3, p6, NULL},
  {3, 3, p7, NULL},
  {3, 3, p8, NULL},
  {3, 3, p9, NULL},
};
piece_t* pieces[10] = { NULL };   // piece variations (saved in a linked-forward-star data structure)

// util functions
static inline bool p_get(piece_t *p, int x, int y) {
  return p->block[p->col * x + y];
}
static inline void p_set(piece_t *p, int x, int y, bool v) {
  p->block[p->col * x + y] = v;
}
static inline piece_t* p_copy(piece_t* p) {
  piece_t* r = malloc(sizeof(piece_t));
  r->row = p->row;
  r->col = p->col;
  r->next = NULL;
  size_t sz = sizeof(bool) * r->row * r->col;
  r->block = malloc(sz);
  memcpy(r->block, p->block, sz);
  return r;
}
static inline piece_t* p_rotate(piece_t *p) {
  piece_t* r = malloc(sizeof(piece_t));
  r->row = p->col;
  r->col = p->row;
  r->next = NULL;
  r->block = malloc(sizeof(bool) * r->row * r->col);
  for (int i = 0; i < r->row; i++)
    for (int j = 0; j < r->col; j++)
      p_set(r, i, j, p_get(p, j, r->row - i - 1));
  free(p);
  return r;
}
static inline piece_t* p_mirror(piece_t *p) {
  piece_t* r = malloc(sizeof(piece_t));
  r->row = p->row;
  r->col = p->col;
  r->next = NULL;
  r->block = malloc(sizeof(bool) * r->row * r->col);
  for (int i = 0; i < r->row; i++)
    for (int j = 0; j < r->col; j++)
      p_set(r, i, j, p_get(p, i, r->col - j - 1));
  free(p);
  return r;
}
static inline bool p_eq(piece_t *p1, piece_t *p2) {
  if (p1->row != p2->row) return false;
  if (p1->col != p2->col) return false;
  for (int i = 0; i < p1->row; i++)
    for (int j = 0; j < p1->col; j++)
      if (p_get(p1, i, j) != p_get(p2, i, j))
        return false;
  return true;
}
static inline void p_collect(piece_t *p, int k) {
  // check in list
  piece_t* q = pieces[k];
  while (q) {
    if (p_eq(q, p)) return;
    q = q->next;
  }

  // prepend
  q = p_copy(p);
  q->next = pieces[k];
  pieces[k] = q;
}
static inline bool p_can_put(piece_t *p, int x, int y) {
  for (int i = 0; i < p->row; i++)
    for (int j = 0; j < p->col; j++)
      if (p_get(p, i, j) && (mask[x + i][y + j] || !target[x + i][y + j]))
        return false;
  return true;
}
static inline void p_put(piece_t *p, int x, int y, int v) {
  for (int i = 0; i < p->row; i++)
    for (int j = 0; j < p->col; j++)
      if (p_get(p, i, j))
        mask[x + i][y + j] = v;     // set value=v
}
static inline void p_unput(piece_t *p, int x, int y) {
  for (int i = 0; i < p->row; i++)
    for (int j = 0; j < p->col; j++)
      if (p_get(p, i, j))
        mask[x + i][y + j] = 0;     // clear value
}

static inline int b_width(int x, int y) {
  int w = 0;
  int v = board_value[x][y];
  switch (board_type[x][y]) {
    case M: w = _mbstrlen(MN[v]) / 3 * 2; break;
    case D: w = _mbstrlen(DN[v]) - 1    ; break;
    case W: w = _mbstrlen(WN[v]) / 3 * 2; break;
  }
  return w;
}
static inline void print_board() {
  puts("[Board]");
  for (int i = 0; i < nrow; i++) {
    putchar('|');
    for (int j = 0; j < ncol; j++) {
      int v = board_value[i][j];
      char *s = MN[0];
      switch (board_type[i][j]) {
        case M: s = MN[v]; break;
        case D: s = DN[v]; break;
        case W: s = WN[v]; break;
      }
      int w = b_width(i, j), d = B_WIDTH - w;
      int pr = d / 2, pl = d - pr;
      while (pl-- > 0) putchar(' ');
      printf(s);
      while (pr-- > 0) putchar(' ');
      putchar('|');
    }
    putchar('\n');
  }
}
static inline void print_solution() {
  puts("[Solution]");
  for (int i = 0; i < nrow; i++) {
    putchar('|');
    for (int j = 0; j < ncol; j++)
      if (mask[i][j] > 0)
        printf(" %d |", mask[i][j] - 1);
      else
        printf(mask[i][j] == 0 ? "   |" : " x |");
    putchar('\n');
  }
}
static inline void print_target() {
  puts("[Target]");
  for (int i = 0; i < nrow; i++) {
    putchar('|');
    for (int j = 0; j < ncol; j++)
      if (target[i][j] == -1)
        printf(" x |");
      else
        printf(" %d |", target[i][j]);
    putchar('\n');
  }
}
static inline void print_piece(piece_t* p) {
  for (int i = 0; i < p->row; i++) {
    for (int j = 0; j < p->col; j++)
      putchar(p_get(p, i, j) ? 'x' : ' ');
    putchar('\n');
  }
}
static inline void print_pieces() {
  puts("[Pieces & Variations]");
  for (int k = 0; k < npieces; k++) {
    int cnt = 0;
    piece_t *p = pieces[k];
    while (p) {
      cnt++;
      print_piece(p); puts("-----");
      p = p->next;
    }
    printf("<< piece %d has %d variations\n", k, cnt);
  }
}

void dfs(int k) {
  if (k == npieces) {
    time_t now = time(NULL);
    printf(">> new solution in %lld sec\n", now - ts_last);
    ts_last = now;
    print_solution();
    return;
  }

  piece_t* p = pieces[k];   // try all variations
  while (p) {
    for (int i = 0; i <= nrow - p->row; i++)      // at all location
      for (int j = 0; j <= ncol - p->col; j++)
        if (p_can_put(p, i, j)) {
          p_put(p, i, j, k + 1);                  // set values=k+1 in mask[][]
          dfs(k + 1);
          p_unput(p, i, j);
        }
    p = p->next;            // next variation
  }
}

static inline void help() {
  printf("Usage: \n");
  printf("   %s\n", bin);
  printf("   %s <month> <date> <weekday>\n", bin);
  exit(-1);
}

// main entry
int main(int argc, char* argv[])  {
  // parse args
  bin = argv[0];
  if (argc == 1) {          // today
    struct tm ts;
    time_t now = time(NULL);
    localtime_s(&ts, &now);
    m = ts.tm_mon + 1;              // 0~11 => 1~12
    d = ts.tm_mday;                 // 1~31
    w = (ts.tm_wday + 6) % 7 + 1;   // 0~6 (Sun. first) => 1~7 (Mon. first)
  } else if (argc == 4) {   // certain day
    m = atoi(argv[1]);
    d = atoi(argv[2]);
    w = atoi(argv[3]);
  } else help();

  // check target
  if (!(1 <= m && m <= 12 && 1 <= d && d <= 31 && 1 <= w && w <= 7)) {
    puts("[Error] invalid target!");
    exit(-2);
  }

  // make piece variations
  for (int k = 0; k < npieces; k++) {
    pieces[k] = &proto[k];   // derive all variations from the prototype
    piece_t *p = p_copy(pieces[k]);   // make a tmp copy

    // rotate
    for (int d = 0; d < 4; d++) {
      p = p_rotate(p);
      p_collect(p, k);
    }
    
    // mirror + rotate
    p = p_mirror(p);
    for (int d = 0; d < 4; d++) {
      p = p_rotate(p);
      p_collect(p, k);
    }

    free(p);
  }

  // init target & current solution
  for (int i = 0; i < nrow; i++)
    for (int j = 0; j < ncol; j++) {
      mask[i][j] = board_value[i][j] ? 0 : -1;    // invalid blocks marked -1, othewise left 0
      switch (board_type[i][j]) {
        case M: target[i][j] = m != board_value[i][j]; break;
        case D: target[i][j] = d != board_value[i][j]; break;
        case W: target[i][j] = w != board_value[i][j]; break;
        case _: target[i][j] = -1; break;
      }
    }
  
  if (debug) { print_pieces(); putchar('\n'); }
  print_board (); putchar('\n');
  print_target(); putchar('\n');

  // rush B!!
  ts_start = ts_last = time(NULL);
  printf("[Solver] search solutions for %s%s %s\n", MN[m], DN[d], WN[w]);
  dfs(0);

  printf(">> done in %lld sec\n", time(NULL) - ts_start);
}
