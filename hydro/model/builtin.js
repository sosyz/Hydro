const perm = require('../permission');
const BUILTIN_ROLES = [
    { _id: 'guest', perm: perm.PERM_BASIC },
    { _id: 'default', perm: perm.PERM_DEFAULT },
    { _id: 'admin', perm: perm.PERM_ADMIN }
];
const CATEGORIES = {
    '动态规划': [
        'LCS',
        'LIS',
        '背包',
        '单调性DP',
        '环形DP',
        '树形DP',
        '状态压缩DP'
    ],
    '搜索': [
        '枚举',
        '搜索与剪枝',
        '启发式搜索',
        'DLX',
        '双向搜索',
        '折半搜索',
        '记忆化搜索',
        '模拟退火'
    ],
    '计算几何': [
        '半平面交',
        '凸包',
        '几何图形的交与并',
        '旋转卡壳',
        '点定位',
        '坐标变换',
        '离散化与扫描',
        '反演',
        'Voronoi图',
        '平面图的对偶图',
        '三角剖分',
        '梯形剖分',
        '几何知识'
    ],
    '贪心': [],
    '树结构': [
        '最近公共祖先',
        '生成树',
        'DFS序列',
        '树上倍增',
        '树的分治',
        '树链剖分',
        'Link-Cut-Tree'
    ],
    '图结构': [
        '平面图',
        '二分图',
        '二分图匹配',
        '最短路',
        '差分约束',
        '拓扑排序',
        '网络流',
        '强连通分量',
        '割点割边',
        '欧拉回路',
        '2-SAT'
    ],
    '数论': [
        '素数判定',
        '欧几里得算法',
        '不定方程',
        '数位统计',
        '解线性同余方程',
        'baby-step-giant-step',
        'Pell方程',
        '大整数质因数分解',
        '勾股方程',
        '积性函数',
        'Fibonacci数列'
    ],
    '模拟': [],
    '数据结构': [
        '栈',
        '队列',
        '链表',
        '单调队列',
        '并查集',
        '堆',
        '平衡树',
        '线段树',
        '树状数组',
        '树套树',
        '四分树',
        '划分树',
        '归并树',
        'k-d树',
        '块状链表',
        'Hashing',
        '函数式编程'
    ],
    '博弈论': [],
    '字符串': [
        'KMP',
        '后缀数据结构',
        'Trie树',
        'AC自动机',
        'Manacher',
        '表达式处理',
        '最小表示法'
    ],
    '组合数学': [
        '生成函数',
        '容斥原理',
        '康托展开',
        'Catalan数列',
        'Stirling数',
        '差分',
        'Polya定理'
    ],
    '线性代数': [
        '矩阵乘法',
        '高斯消元',
        '线性规划'
    ],
    '高精度': [
        'FFT'
    ],
    '递推': [],
    '概率论': [
        '随机化'
    ],
    'NPC': [],
    '其他': [
        '二分查找',
        '三分查找',
        '双指针扫描',
        '分治',
        '分块',
        'RMQ',
        '快速幂',
        '数学',
        '排序',
        '构造'
    ]
};
const FOOTER_EXTRA_HTMLS = [];
const VIEW_LANGS = [
    { code: 'zh-CN', name: 'zh-CN' }
];
const LANGS = {
    cc: 'cpp'
};
const LANG_TEXTS = {
    c: 'C',
    cc: 'C++',
    cs: 'C#',
    pas: 'Pascal',
    java: 'Java',
    py: 'Python',
    py3: 'Python 3',
    php: 'PHP',
    rs: 'Rust',
    hs: 'Haskell',
    js: 'JavaScript',
    go: 'Go',
    rb: 'Ruby',
};
const LANG_HIGHLIGHT_ID = {
    c: 'c',
    cc: 'cpp',
    cs: 'csharp',
    pas: 'pascal',
    java: 'java',
    py: 'python',
    py3: 'python',
    php: 'php',
    rs: 'rust',
    hs: 'haskell',
    js: 'javascript',
    go: 'go',
    rb: 'ruby',
};
const STATUS = {
    STATUS_WAITING: 0,
    STATUS_ACCEPTED: 1,
    STATUS_WRONG_ANSWER: 2,
    STATUS_TIME_LIMIT_EXCEEDED: 3,
    STATUS_MEMORY_LIMIT_EXCEEDED: 4,
    STATUS_OUTPUT_LIMIT_EXCEEDED: 5,
    STATUS_RUNTIME_ERROR: 6,
    STATUS_COMPILE_ERROR: 7,
    STATUS_SYSTEM_ERROR: 8,
    STATUS_CANCELED: 9,
    STATUS_ETC: 10,
    STATUS_JUDGING: 20,
    STATUS_COMPILING: 21,
    STATUS_FETCHED: 22,
    STATUS_IGNORED: 30
};
const STATUS_TEXTS = {
    [STATUS.STATUS_WAITING]: 'Waiting',
    [STATUS.STATUS_ACCEPTED]: 'Accepted',
    [STATUS.STATUS_WRONG_ANSWER]: 'Wrong Answer',
    [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: 'Time Exceeded',
    [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: 'Memory Exceeded',
    [STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED]: 'Output Exceeded',
    [STATUS.STATUS_RUNTIME_ERROR]: 'Runtime Error',
    [STATUS.STATUS_COMPILE_ERROR]: 'Compile Error',
    [STATUS.STATUS_SYSTEM_ERROR]: 'System Error',
    [STATUS.STATUS_CANCELED]: 'Cancelled',
    [STATUS.STATUS_ETC]: 'Unknown Error',
    [STATUS.STATUS_JUDGING]: 'Running',
    [STATUS.STATUS_COMPILING]: 'Compiling',
    [STATUS.STATUS_FETCHED]: 'Fetched',
    [STATUS.STATUS_IGNORED]: 'Ignored',
};
const STATUS_CODES = {
    0: 'pending',
    1: 'pass',
    2: 'fail',
    3: 'fail',
    4: 'fail',
    5: 'fail',
    6: 'fail',
    7: 'fail',
    8: 'fail',
    9: 'ignored',
    10: 'fail',
    20: 'progress',
    21: 'progress',
    22: 'progress',
    30: 'ignored'
};
module.exports = {
    BUILTIN_ROLES, CATEGORIES, VIEW_LANGS, FOOTER_EXTRA_HTMLS, LANGS,
    LANG_TEXTS, LANG_HIGHLIGHT_ID, STATUS, STATUS_TEXTS, STATUS_CODES
};