/* 剧读 · Alexander Hamilton 内容
 * 歌词与译文来自《Hamilton 全曲歌词（英中对照）.txt》；背景为英文记叙文 + 生词 + 阅读题 + 参考来源。
 */
window.MUSICAL_SONGS = window.MUSICAL_SONGS || {};
window.MUSICAL_SONGS["alexander-hamilton"] = {
  "id": "alexander-hamilton",
  "showId": "hamilton",
  "n": 1,
  "title": "Alexander Hamilton",
  "show": "Hamilton: An American Musical",
  "writer": "Lin-Manuel Miranda",
  "year": 2015,
  "runtime": "3:57",
  "tagline": "开场曲 · 一个孤儿如何成为国父",
  "audioSrc": "audio/hamilton/01-alexander-hamilton.m4a",
  "intro": "全曲 80 行已整理入库（按原专辑断行，已去掉制作名单）。每一行都有讲解，其中 15 处展开到语法、词汇和短语；全曲分成 5 个区，可以一段一段过。",
  "sections": [
    {
      "id": "s1",
      "title": "The Question",
      "zh": "提问",
      "note": "全剧第一句是一个跨四行的长问句。Miranda 先不给答案，先给一个问题：一个最底层的私生子，怎么可能长成国父？",
      "lines": [
        {
          "id": "l1",
          "text": "How does a bastard, orphan, son of a whore and a",
          "zh": "为何一个私生子、孤儿、妓女和",
          "note": "先找谓语：主语堆了四个身份标签，谓语 grow up 要等到第 4 行。读英语长句，先抓「谁」和「做什么」，中间夹的都是修饰。",
          "grammar": [
            {
              "t": "How does + 主语 + 动词原形?",
              "d": "特殊疑问句：助动词 does 提前，实义动词 grow 回到原形。问的是方式（how），不是身份（who）。",
              "card": {
                "front": "How does ... grow up to be ...?",
                "back": "……是怎么长成……的？特殊疑问句：does 提前、动词用原形；问过程，不问身份。"
              }
            },
            {
              "t": "同位语堆叠",
              "d": "bastard, orphan, son of a whore and a Scotsman 四个名词短语并列，都是 a 后面的同位语，一层层补完「他是谁」。中文习惯用顿号，英语靠逗号和 and。"
            },
            {
              "t": "主语被拉长",
              "d": "a bastard…and a Scotsman 之后又插入 dropped…（分词短语）和 by providence…（介词短语），谓语被推到第 4 行。这是英语长句最常见的「悬挂」结构。"
            }
          ],
          "words": [
            {
              "w": "bastard",
              "ipa": "/ˈbæstərd/",
              "pos": "n.",
              "zh": "私生子；混蛋",
              "d": "婚外所生的人，是极侮辱性的词。剧里用它开篇是故意粗粝：先把你按到最底层，再让你看他往上爬。"
            },
            {
              "w": "orphan",
              "ipa": "/ˈɔːrfən/",
              "pos": "n.",
              "zh": "孤儿",
              "d": "汉密尔顿父亲离家、母亲早逝，orphan 不是修辞，是事实。"
            },
            {
              "w": "Scotsman",
              "ipa": "/ˈskɑːtsmən/",
              "pos": "n.",
              "zh": "苏格兰人（男性）",
              "d": "他的父亲 James Hamilton 是苏格兰人。注意 Scotsman 指「人」，Scotland 指「地方」。"
            }
          ],
          "phrases": [
            {
              "p": "son of a whore",
              "type": "粗俗语",
              "zh": "妓女的儿子",
              "d": "极粗俗的骂人话，正式场合绝对不能用。",
              "ex": "He was called a son of a whore.",
              "exZh": "他被人骂作妓女的儿子。"
            }
          ],
          "sound": "bastard / orphan / son of a whore / Scotsman 每个身份词都重读，像四下鼓点。这句的冲击力来自节奏，不来自押韵。",
          "bg": [
            "bio"
          ]
        },
        {
          "id": "l2",
          "text": "Scotsman, dropped in the middle of a",
          "zh": "苏格兰佬的儿子",
          "note": "dropped 的逻辑主语还是汉密尔顿：他被「丢」在那里。用过去分词而不是 who was dropped，句子更短、更冷，像在说一件行李。",
          "grammar": [
            {
              "t": "过去分词短语",
              "d": "dropped… 相当于 who was dropped…，修饰前面的 a bastard…。分词短语让句子紧凑，也让他显得像一件被丢弃的行李。"
            },
            {
              "t": "介词短语嵌套",
              "d": "in the middle of / a forgotten spot / in the Caribbean，三个介词短语一层套一层。翻译时从后往前拆最顺。"
            },
            {
              "t": "a forgotten spot",
              "d": "forgotten 是过去分词作形容词。spot 在这里不是「斑点」，是「地方」（a nice spot 好地方）。"
            }
          ],
          "words": [
            {
              "w": "Caribbean",
              "ipa": "/ˌkærɪˈbiːən/",
              "pos": "n./adj.",
              "zh": "加勒比海（的）",
              "d": "重音在 -rib-，拼写里有两个 r、一个 b。"
            }
          ],
          "phrases": [
            {
              "p": "in the middle of",
              "type": "固定搭配",
              "zh": "在……中间；正忙于",
              "d": "既可指空间，也可指过程。",
              "ex": "She is in the middle of a meeting.",
              "exZh": "她正在开会。"
            },
            {
              "p": "a forgotten spot",
              "type": "固定搭配",
              "zh": "被遗忘的角落",
              "d": "spot 指具体地点，比 place 更口语。",
              "ex": "The village is a forgotten spot on the map.",
              "exZh": "这个村子是地图上一个被遗忘的角落。"
            }
          ],
          "sound": "dropped / forgotten / spot 都落在重拍上，读起来像被一下一下按进地里。",
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l3",
          "text": "Forgotten spot in the Caribbean by providence",
          "zh": "降生于加勒比海的一片荒芜",
          "note": "三个短语并列，都在补充「被丢下时是什么状态」。省略了 being / he was，歌词和诗歌里很常见。",
          "grammar": [
            {
              "t": "by + 抽象名词",
              "d": "by providence = 靠天意、托天保佑。by 表方式，后面常接抽象名词：by chance（碰巧）、by luck（靠运气）。",
              "card": {
                "front": "by + 抽象名词",
                "back": "靠……、凭借……：by chance 碰巧；by providence 靠天意；by luck 靠运气。"
              }
            },
            {
              "t": "形容词与介词短语并列",
              "d": "impoverished（形容词）和 in squalor（介词短语）与 by providence 并列，三个成分共同描述状态。并列项词性可以不同，功能要一致。"
            },
            {
              "t": "省略",
              "d": "完整说法大约是 being impoverished and living in squalor。省略让句子更急、更冷。"
            }
          ],
          "words": [
            {
              "w": "providence",
              "ipa": "/ˈprɑːvɪdəns/",
              "pos": "n.",
              "zh": "天意，天佑",
              "d": "大写 Providence 常指「上帝」；这里小写，更像「命运的安排」。"
            },
            {
              "w": "impoverished",
              "ipa": "/ɪmˈpɑːvərɪʃt/",
              "pos": "adj.",
              "zh": "赤贫的",
              "d": "动词 impoverish（使贫穷）+ -ed。比 poor 正式，也更重。"
            },
            {
              "w": "squalor",
              "ipa": "/ˈskwɑːlər/",
              "pos": "n.",
              "zh": "污秽，肮脏（多指贫困环境）",
              "d": "不可数名词。live in squalor = 生活在肮脏贫困中。"
            }
          ],
          "phrases": [
            {
              "p": "in squalor",
              "type": "固定搭配",
              "zh": "在污秽贫困中",
              "d": "常与 live 连用。",
              "ex": "They lived in squalor for years.",
              "exZh": "他们多年生活在污秽贫困中。"
            }
          ],
          "sound": "impoverished 五个音节，squalor 两个，一长一短，像喘不上气。",
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l4",
          "text": "Impoverished, in squalor",
          "zh": "家徒四壁，潦倒困苦",
          "note": "两个状态词并列，省略了 being：一贫如洗、住在污秽里。impoverished 比 poor 重得多。"
        },
        {
          "id": "l5",
          "text": "Grow up to be a hero and a scholar?",
          "zh": "最终能够成为一个伟人与学界巨富？",
          "note": "谓语终于出现：grow up to be。到这里，跨了四行的问句才闭合。",
          "grammar": [
            {
              "t": "grow up to be",
              "d": "「长大后成为」。to be 表结果，类似 grow up to do sth（长大后做某事）。",
              "card": {
                "front": "grow up to be ...",
                "back": "长大后成为……。to be 表结果：He grew up to be a doctor."
              }
            },
            {
              "t": "hero and a scholar",
              "d": "两个名词并列，第二个前面重复冠词 a，强调是两种身份，而不是一个「英雄学者」。"
            }
          ],
          "words": [
            {
              "w": "scholar",
              "ipa": "/ˈskɑːlər/",
              "pos": "n.",
              "zh": "学者",
              "d": "与 school 同源但发音不同；scholarship 既指「奖学金」也指「学术」。"
            }
          ],
          "phrases": [
            {
              "p": "grow up to be",
              "type": "动词短语",
              "zh": "长大成为",
              "d": "to be 表结果，主语通常是人。",
              "ex": "She grew up to be a lawyer.",
              "exZh": "她长大后成了一名律师。"
            }
          ],
          "sound": "scholar 收尾，声音干净利落，为下一句的 ten-dollar 留了个同韵的钩子。",
          "bg": [
            "question"
          ]
        },
        {
          "id": "l6",
          "text": "The ten-dollar founding father without a father",
          "zh": "十美元上的国父，被父亲抛弃",
          "note": "整句没有谓语，是一个名词短语，直接当下一句的主语。歌词里这种「断句」很常见，作用是砸出一个画面。",
          "grammar": [
            {
              "t": "名词短语独立成句",
              "d": "The ten-dollar Founding Father without a father 没有动词，是刻意的省略。它不像句子，更像一个头衔、一块铭牌。"
            },
            {
              "t": "without a father",
              "d": "介词短语后置修饰 Founding Father。without 表「没有」，比 no father 更书面、更冷。"
            }
          ],
          "words": [
            {
              "w": "founding father",
              "ipa": "/ˈfaʊndɪŋ ˈfɑːðər/",
              "pos": "n.",
              "zh": "国父，开国元勋",
              "d": "特指美国建国一代；小写也可泛指某事物的奠基人。剧里大写，是当头像用。"
            }
          ],
          "phrases": [
            {
              "p": "without a father",
              "type": "固定搭配",
              "zh": "没有父亲",
              "d": "既是事实，也是隐喻。",
              "ex": "He grew up without a father.",
              "exZh": "他在没有父亲的环境中长大。"
            }
          ],
          "sound": "ten-dollar / without a father：两处 -dollar / -father 的尾韵，把「钱」和「父」钉在一起——双关就落在这个韵上。",
          "bg": [
            "ten-dollar"
          ]
        },
        {
          "id": "l7",
          "text": "Got a lot farther by working a lot harder",
          "zh": "以己之力求索人生之路",
          "note": "by + 动名词表方式。从这里开始，连续四个 by doing 排比，是全剧最著名的一串。",
          "grammar": [
            {
              "t": "by + V-ing",
              "d": "「通过做某事」。by 后面接动名词，不接不定式：by working（不是 by to work）。",
              "card": {
                "front": "by + V-ing",
                "back": "通过做某事（表方式）：He passed by working hard. by 后接动名词，不接 to do。"
              }
            },
            {
              "t": "a lot + 比较级",
              "d": "a lot farther / a lot harder：a lot 修饰比较级，表示「……得多」。同类还有 much、far、even。"
            },
            {
              "t": "farther vs further",
              "d": "farther 多指距离或程度上的「更远」；further 更常用于抽象义「进一步」。这里用 farther，更口语、更有画面。"
            }
          ],
          "words": [
            {
              "w": "farther",
              "ipa": "/ˈfɑːrðər/",
              "pos": "adv.",
              "zh": "更远（far 的比较级）",
              "d": "常与 further 混用；指物理距离时 farther 更稳妥。"
            }
          ],
          "phrases": [
            {
              "p": "a lot farther",
              "type": "固定搭配",
              "zh": "远得多",
              "d": "a lot 修饰比较级，表示「……得多」。",
              "ex": "You can get a lot farther with a plan.",
              "exZh": "有计划你能走得更远。"
            },
            {
              "p": "by working hard",
              "type": "动词短语",
              "zh": "通过努力工作",
              "d": "by + V-ing 表方式。",
              "ex": "He got there by working hard.",
              "exZh": "他靠努力工作走到了那里。"
            }
          ],
          "sound": "farther / harder 是这一串 -arter 韵的第一对。后面还有 smarter / self-starter / charter，五连押。",
          "bg": [
            "craft"
          ]
        },
        {
          "id": "l8",
          "text": "By being a lot smarter",
          "zh": "凭借禀异天赋",
          "note": "being 是 be 的动名词。by being + 形容词，表示「靠保持某种状态」。",
          "grammar": [
            {
              "t": "by being + 形容词",
              "d": "being 是动名词，后面接形容词作表语：by being smart（靠聪明）。这一串排比全靠 by + doing 撑起来。"
            },
            {
              "t": "比较级省略",
              "d": "a lot smarter 后面省略了 than most people。比较对象不出现，读者自己补。"
            }
          ],
          "words": [],
          "phrases": [
            {
              "p": "by being smart",
              "type": "动词短语",
              "zh": "靠聪明",
              "d": "by + being + 形容词。",
              "ex": "She won by being smart.",
              "exZh": "她靠聪明取胜。"
            }
          ],
          "sound": "smarter 与上一行 harder 押 -arter，节奏开始加速。",
          "bg": [
            "craft"
          ]
        },
        {
          "id": "l9",
          "text": "By being a self-starter",
          "zh": "依靠自学以塑",
          "note": "self-starter 是合成词：self-（自我）+ starter（启动者）。英语里 self- 开头的词很多，构词规律很整齐。",
          "grammar": [
            {
              "t": "合成词 self-",
              "d": "self- + 名词/形容词：self-starter（自我驱动的人）、self-made（白手起家的）、self-taught（自学成才的）、self-control（自控）。",
              "card": {
                "front": "self- 合成词",
                "back": "self- + n./adj.：self-starter 自我驱动的人；self-made 白手起家的；self-taught 自学成才的；self-control 自控力。"
              }
            }
          ],
          "words": [
            {
              "w": "self-starter",
              "ipa": "/ˌself ˈstɑːrtər/",
              "pos": "n.",
              "zh": "自我驱动的人，有主动性的人",
              "d": "start 本身有「启动」义，starter 是「启动器」。这个词几乎是汉密尔顿的传记标题。"
            }
          ],
          "phrases": [
            {
              "p": "self-starter",
              "type": "合成词",
              "zh": "自我驱动的人",
              "d": "职场高频词。",
              "ex": "We need a self-starter for this job.",
              "exZh": "这个岗位需要一个自我驱动的人。"
            }
          ],
          "sound": "self-starter 与 harder / smarter / farther 继续押 -arter。四个词把「努力」本身念成了节奏。",
          "bg": [
            "craft"
          ]
        },
        {
          "id": "l10",
          "text": "By fourteen, they placed him in charge of a",
          "zh": "在十四岁，众人请他掌管",
          "note": "by fourteen 是「到十四岁时」，不是「十四岁那年」。by 表示「不迟于某个时间点」。",
          "grammar": [
            {
              "t": "by + 时间/年龄",
              "d": "by 表示「到……时为止、不迟于」。by fourteen = 到十四岁时，常与完成时连用：By 14, he had read every book.",
              "card": {
                "front": "by + 时间",
                "back": "到……时为止（不迟于）：by fourteen 到十四岁时；by then 到那时；by Friday 最迟周五。"
              }
            },
            {
              "t": "in charge of",
              "d": "sb be in charge of sth = 某人负责某事；sth be in the charge of sb = 某事由某人负责。注意冠词位置。"
            }
          ],
          "words": [
            {
              "w": "charter",
              "ipa": "/ˈtʃɑːrtər/",
              "pos": "n.",
              "zh": "特许状；包租",
              "d": "trading charter = 贸易特许状。当时做生意需要殖民地政府颁发的许可。"
            }
          ],
          "phrases": [
            {
              "p": "put sb in charge of sth",
              "type": "动词短语",
              "zh": "让某人负责某事",
              "d": "被动：sb be put in charge of sth。",
              "ex": "They put her in charge of the project.",
              "exZh": "他们让她负责这个项目。"
            }
          ],
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l11",
          "text": "Trading charter",
          "zh": "贸易财务",
          "note": "上一句的宾语补足：in charge of a trading charter，掌管一份贸易特许状。charter 这里指殖民政府发的贸易许可。"
        }
      ]
    },
    {
      "id": "s2",
      "title": "The Hurricane",
      "zh": "飓风",
      "note": "一场飓风改写了命运：他写下第一首诗，岛上的人凑钱把他送去北美。",
      "lines": [
        {
          "id": "l12",
          "text": "And every day while slaves were being slaughtered and carted",
          "zh": "每一日目睹黑奴惨遭屠戮，运进船库，远渡海陆",
          "note": "were being slaughtered 是「过去进行时的被动」：当时正在被屠杀。",
          "grammar": [
            {
              "t": "was/were being + 过去分词",
              "d": "过去进行时的被动语态，强调过去某一时刻「正在被……」。The bridge was being built. 桥当时正在修建。",
              "card": {
                "front": "was/were being + V-ed",
                "back": "过去进行时的被动：当时正在被……。The house was being painted."
              }
            },
            {
              "t": "carted away",
              "d": "cart 作动词 = 用车运走，away 表示离开。画面是被装上船运走。"
            }
          ],
          "words": [
            {
              "w": "slaughter",
              "ipa": "/ˈslɔːtər/",
              "pos": "v./n.",
              "zh": "屠杀",
              "d": "比 kill 重得多，常用于战争、屠宰。"
            },
            {
              "w": "cart",
              "ipa": "/kɑːrt/",
              "pos": "v.",
              "zh": "用车运送",
              "d": "名词是「马车、手推车」，动词就是「用车拉」。"
            }
          ],
          "phrases": [
            {
              "p": "cart away",
              "type": "动词短语",
              "zh": "运走，拉走",
              "d": "常与 away/off 连用。",
              "ex": "The rubbish was carted away.",
              "exZh": "垃圾被运走了。"
            }
          ],
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l13",
          "text": "Away across the waves, he struggled and kept his guard up",
          "zh": "他时刻饱受挣扎，警惕如临深谷",
          "note": "carted away across the waves：被装上船运过大洋。he struggled and kept his guard up = 他挣扎着、时刻提防。"
        },
        {
          "id": "l14",
          "text": "Inside, he was longing for something to be a part of",
          "zh": "内心中却在寻找一种信仰来守护",
          "note": "long for = 渴望；something to be a part of = 一个可以归属的东西。"
        },
        {
          "id": "l15",
          "text": "The brother was ready to beg, steal, borrow, or barter",
          "zh": "这小子已经准备去讨去偷去借或乖乖做一个商户",
          "note": "the brother 是称呼「这小子」；beg / steal / borrow / barter 四个动词并列，节奏感很强。barter 是以物易物。"
        },
        {
          "id": "l16",
          "text": "Then a hurricane came, and devastation reigned",
          "zh": "此时一场飓风袭来，留下遍地尸骸",
          "note": "devastation reigned 把「灾难」写成了君王：满目疮痍，灾难笼罩一切。",
          "grammar": [
            {
              "t": "reign 的比喻义",
              "d": "reign 本义「统治、在位」，用于抽象名词时表示「盛行、笼罩」：Silence reigned. 一片寂静。Devastation reigned. 满目疮痍。"
            }
          ],
          "words": [
            {
              "w": "devastation",
              "ipa": "/ˌdevəˈsteɪʃn/",
              "pos": "n.",
              "zh": "毁灭，破坏",
              "d": "动词 devastate（摧毁）。飓风过后的小岛就是 devastation。"
            },
            {
              "w": "reign",
              "ipa": "/reɪn/",
              "pos": "v.",
              "zh": "统治；盛行",
              "d": "同音词 rain（雨）——拼写不同，意思完全不同。"
            }
          ],
          "phrases": [
            {
              "p": "devastation reigned",
              "type": "固定搭配",
              "zh": "满目疮痍，灾难笼罩",
              "d": "reign 用于抽象事物，表示「盛行、笼罩」。",
              "ex": "After the storm, devastation reigned.",
              "exZh": "风暴过后，满目疮痍。"
            }
          ],
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l17",
          "text": "Our man saw his future drip, dripping down the drain",
          "zh": "这兄弟眼望自己的未来，似要坠入阴霾",
          "note": "drip, dripping 的重复在模拟「一滴一滴」：未来正从指缝里流走。",
          "grammar": [
            {
              "t": "重复与拟声",
              "d": "drip 先作动词，dripping 再作分词重复一次，既模拟滴水声，也拉长「流失」的过程。歌词常用重复制造节奏。"
            },
            {
              "t": "down the drain",
              "d": "字面「流进下水道」，引申「白白浪费、付诸东流」：All that work went down the drain."
            }
          ],
          "words": [
            {
              "w": "drain",
              "ipa": "/dreɪn/",
              "pos": "n./v.",
              "zh": "下水道；排干",
              "d": "动词「排空、流走」：The water drained away."
            }
          ],
          "phrases": [
            {
              "p": "go down the drain",
              "type": "习语",
              "zh": "付诸东流，白白浪费",
              "d": "常与 money/time/effort 连用。",
              "ex": "All our work went down the drain.",
              "exZh": "我们所有的努力都付诸东流。"
            }
          ],
          "sound": "drip / dripping / drain 三个 d 开头的词连在一起，像水滴一路往下。"
        },
        {
          "id": "l18",
          "text": "Put a pencil to his temple, connected it to his brain",
          "zh": "于是提笔抵着太阳穴，连接向他的脑海",
          "note": "把笔抵在太阳穴、连到大脑——写字的画面。put sth to sth = 把……贴到……。"
        },
        {
          "id": "l19",
          "text": "And he wrote his first refrain, a testament to his pain",
          "zh": "写下了他第一首诗篇，自己苦难的颂赞",
          "note": "refrain 本指歌曲的反复句，这里指他写的第一首诗；a testament to = ……的证明。"
        },
        {
          "id": "l20",
          "text": "Well, the word got around, they said, “This kid is insane, man”",
          "zh": "作品传颂开来，人道这孩子真挺不赖",
          "note": "the word got around = 消息传开了。word 在这里是「消息」，不可数。",
          "grammar": [
            {
              "t": "word = 消息",
              "d": "不可数：Word has it that...（有消息说……）；Word gets around.（消息会传开）。"
            },
            {
              "t": "直接引语",
              "d": "they said, “This kid is insane, man” 用引号直接引用，比间接引语更有现场感。"
            }
          ],
          "words": [
            {
              "w": "insane",
              "ipa": "/ɪnˈseɪn/",
              "pos": "adj.",
              "zh": "疯狂的；极厉害的（口语）",
              "d": "in-（不）+ sane（神志清醒）。口语里也可表示「太牛了」。"
            }
          ],
          "phrases": [
            {
              "p": "word gets around",
              "type": "习语",
              "zh": "消息传开",
              "d": "word 作「消息」时不可数。",
              "ex": "Word gets around fast in a small town.",
              "exZh": "在小镇上消息传得很快。"
            }
          ],
          "bg": [
            "bio"
          ]
        },
        {
          "id": "l21",
          "text": "Took up a collection just to send him to the mainland",
          "zh": "快送他到本土大陆，为他筹笔钱财",
          "note": "take up a collection = 募捐；the mainland 指北美大陆（相对加勒比海的岛）。"
        },
        {
          "id": "l22",
          "text": "“Get your education, don’t forget from whence you came, and",
          "zh": "去上学吧，别忘了自己从何处而来",
          "note": "from whence 是古旧说法：whence 本身已经等于 from where，再加 from 是文学化的强调。",
          "grammar": [
            {
              "t": "whence = from where",
              "d": "古旧/文学用语，现代英语多说 where ... from：Don’t forget where you came from.",
              "card": {
                "front": "whence",
                "back": "= from where，「从何处」。from whence 属古旧用法，今天多用 where ... from。"
              }
            },
            {
              "t": "否定祈使句",
              "d": "Don’t forget + 从句：别忘了……。引号里是长辈对少年说话的语气。"
            }
          ],
          "words": [
            {
              "w": "whence",
              "ipa": "/wens/",
              "pos": "adv.",
              "zh": "从何处（古旧）",
              "d": "同根词 hence（因此）、thence（从那里）。"
            }
          ],
          "phrases": [
            {
              "p": "from whence you came",
              "type": "固定搭配",
              "zh": "你来自的地方",
              "d": "文学化；日常说 where you come from。",
              "ex": "Don’t forget from whence you came.",
              "exZh": "别忘了你来自哪里。"
            }
          ],
          "bg": [
            "caribbean"
          ]
        },
        {
          "id": "l23",
          "text": "The world is gonna know your name. What’s your name, man?”",
          "zh": "这世界将会听闻你的名字, 你叫什么，现在登台——",
          "note": "gonna = going to 的口语写法；两句一扬一收，把名字逼出来。"
        },
        {
          "id": "l24",
          "text": "Alexander Hamilton",
          "zh": "亚历山大·汉密尔顿",
          "note": "名字第一次出现，只有两个词——全剧的第一个「主题句」。"
        },
        {
          "id": "l25",
          "text": "My name is Alexander Hamilton",
          "zh": "我叫亚历山大·汉密尔顿",
          "note": "自我介绍的标准句型：My name is ...。"
        },
        {
          "id": "l26",
          "text": "And there’s a million things I haven’t done",
          "zh": "这里还有千万未竟之事为我等待",
          "note": "there’s = there are（口语里常用 there’s 接复数）；a million 是夸张；haven’t done 是现在完成时：还有千万件事没做。"
        },
        {
          "id": "l27",
          "text": "But just you wait, just you wait...",
          "zh": "只请你们等着看，你们等着看...",
          "note": "just you wait 是「你等着看」，全剧反复出现的口号。"
        }
      ]
    },
    {
      "id": "s3",
      "title": "The Orphan",
      "zh": "孤儿",
      "note": "父亲出走、母亲病逝、表兄自杀——这一段把「孤儿」两个字讲透。",
      "lines": [
        {
          "id": "l28",
          "text": "When he was ten his father split, full of it, debt-ridden",
          "zh": "十岁时，父亲出走，留下累累负债",
          "note": "split 口语「离开、散伙」；full of it 满嘴借口/自大；debt-ridden 负债累累（debt + ridden 的复合形容词）。"
        },
        {
          "id": "l29",
          "text": "Two years later, see Alex and his mother bed-ridden",
          "zh": "二年后，母亲重病，与他共卧病榻",
          "note": "bed-ridden 卧床不起；see Alex and his mother... 用 see 带出画面。"
        },
        {
          "id": "l30",
          "text": "Half-dead sittin in their own sick, the scent thick",
          "zh": "在病房中忍受污浊空气与病害",
          "note": "sick 这里作名词，指呕吐物/病；the scent thick 是独立主格：气味浓重。"
        },
        {
          "id": "l31",
          "text": "And Alex got better but his mother went quick",
          "zh": "亚历山大痊愈了，他的母亲却走得很快……",
          "note": "went quick = 走得很快，quick 在口语里作副词；got better 是「好转」。"
        },
        {
          "id": "l32",
          "text": "Moved in with a cousin, the cousin committed suicide",
          "zh": "过继到了表兄家，表兄却又自我了结",
          "note": "省略主语 He：He moved in with a cousin；commit suicide = 自杀。"
        },
        {
          "id": "l33",
          "text": "Left him with nothin’ but ruined pride, something new inside",
          "zh": "没留任何东西给他，除了傲骨上新添的伤疤",
          "note": "leave sb with sth = 给某人留下……；nothing but = 只有。ruined pride 破碎的自尊。"
        },
        {
          "id": "l34",
          "text": "A voice saying",
          "zh": "一个声音浮现",
          "note": "a voice saying 引出下一句的直接引语。"
        },
        {
          "id": "l35",
          "text": "“You gotta fend for yourself.”(“Alex, you gotta fend for yourself.”)",
          "zh": "「你只能依靠自己！」（「亚历山大，你只能依靠自己！」）",
          "note": "gotta 是 got to 的口语缩略，歌词里到处都是；写作时用 have to / must。",
          "grammar": [
            {
              "t": "gotta = have got to",
              "d": "口语缩略：I gotta go = I have got to go = I must go。理解即可，正式写作别用。",
              "card": {
                "front": "gotta",
                "back": "= have got to，「必须、得」，口语缩略；正式写作改用 have to / must。"
              }
            },
            {
              "t": "fend for yourself",
              "d": "fend for oneself = 自己养活自己、独立应对。反身代词随主语变化：He fends for himself."
            }
          ],
          "words": [],
          "phrases": [
            {
              "p": "fend for yourself",
              "type": "动词短语",
              "zh": "自己养活自己，独立应对",
              "d": "也作 fend for oneself。",
              "ex": "The children had to fend for themselves.",
              "exZh": "孩子们不得不自己照顾自己。"
            }
          ],
          "bg": [
            "bio"
          ]
        }
      ]
    },
    {
      "id": "s4",
      "title": "New York",
      "zh": "纽约",
      "note": "读书、记账、做买卖，然后登上驶向新大陆的船。副歌是整部剧的移民宣言。",
      "lines": [
        {
          "id": "l36",
          "text": "He started retreatin’ and readin’ every treatise on the shelf",
          "zh": "他忍住哭泣，开始贪婪地笃学古今",
          "note": "retreatin’ / readin’ 是 retreating / reading 掉了 -g 的口语写法。retreat 本是「撤退」，这里指退回到书堆里。",
          "words": [
            {
              "w": "treatise",
              "ipa": "/ˈtriːtɪs/",
              "pos": "n.",
              "zh": "论文，专著",
              "d": "a treatise on... = 关于……的论著，比 paper 正式。"
            }
          ]
        },
        {
          "id": "l37",
          "text": "There would have been nothin’ left to do",
          "zh": "也许他的生命将混混而度",
          "note": "There would have been nothing left to do 是虚拟语气：本来会无事可做。"
        },
        {
          "id": "l38",
          "text": "For someone less astute",
          "zh": "若无他这种才赋",
          "note": "For someone less astute = 对一个没这么精明的人来说，是含蓄条件句（if he had been less astute）。",
          "words": [
            {
              "w": "astute",
              "ipa": "/əˈstuːt/",
              "pos": "adj.",
              "zh": "精明的，敏锐的",
              "d": "an astute observer = 敏锐的观察者；名词 astuteness。"
            },
            {
              "w": "destitute",
              "ipa": "/ˈdestɪtuːt/",
              "pos": "adj.",
              "zh": "一无所有的，赤贫的",
              "d": "比 poor 更重：destitute and homeless。"
            },
            {
              "w": "restitution",
              "ipa": "/ˌrestɪˈtuːʃn/",
              "pos": "n.",
              "zh": "赔偿，归还",
              "d": "make restitution for sth = 为……作出赔偿。"
            }
          ]
        },
        {
          "id": "l39",
          "text": "He woulda been dead or destitute",
          "zh": "他或将死去或活于困苦",
          "note": "woulda = would have 的口语写法；destitute = 一无所有。"
        },
        {
          "id": "l40",
          "text": "Without a cent of restitution",
          "zh": "承受不住一分的债务",
          "note": "Without a cent of restitution = 一分钱赔偿都拿不到。restitution 赔偿。"
        },
        {
          "id": "l41",
          "text": "Started workin’, clerkin’ for his late mother’s landlord",
          "zh": "但他却自力更生，为已故母亲的房东记账做工",
          "note": "省略主语 He：He started working, clerking for...；clerk 作动词是「当职员」。late mother = 已故的母亲。"
        },
        {
          "id": "l42",
          "text": "Tradin’ sugar cane and rum and all the things he can’t afford",
          "zh": "打理着他付不起的甘蔗和朗姆酒的买卖来谋生",
          "note": "Tradin’ 与上一句 started 并列；things he can’t afford 是省略 that 的定语从句。sugar cane 甘蔗、rum 朗姆酒，是加勒比贸易的两大商品。",
          "words": [
            {
              "w": "sugar cane",
              "ipa": "/ˈʃʊɡər keɪn/",
              "pos": "n.",
              "zh": "甘蔗",
              "d": "加勒比殖民地的主要作物，也是奴隶贸易的核心商品。"
            },
            {
              "w": "rum",
              "ipa": "/rʌm/",
              "pos": "n.",
              "zh": "朗姆酒",
              "d": "用甘蔗糖蜜酿造，三角贸易里的硬通货。"
            }
          ]
        },
        {
          "id": "l43",
          "text": "Scammin’ for every book he can get his hands on",
          "zh": "嗜读着他所能碰到的每一本书",
          "note": "scam 本是「诈骗」，scam for 这里引申「想方设法弄到」；get one’s hands on = 弄到手。",
          "phrases": [
            {
              "p": "get one’s hands on",
              "type": "动词短语",
              "zh": "弄到手，得到",
              "d": "口语，表示「弄到手」。",
              "ex": "I need to get my hands on that book.",
              "exZh": "我得弄到那本书。"
            }
          ]
        },
        {
          "id": "l44",
          "text": "Plannin’ for the future see him now as he stands on",
          "zh": "憧憬着未来，现在他终于站上",
          "note": "三个分词并列：working / trading / planning，最后镜头切到船上。see him now 是祈使句「现在看他」。"
        },
        {
          "id": "l45",
          "text": "The bow of a ship headed for a new land",
          "zh": "一艘航船，驶向新大陆的海港",
          "note": "the bow 读 /baʊ/，船头；headed for = 驶向。",
          "words": [
            {
              "w": "bow",
              "ipa": "/baʊ/",
              "pos": "n.",
              "zh": "船头",
              "d": "注意与 bow /boʊ/（弓、鞠躬）同形不同音。"
            }
          ]
        },
        {
          "id": "l46",
          "text": "In New York you can be a new man",
          "zh": "在纽约，你将脱胎换骨大不一样",
          "note": "全剧的移民宣言：在纽约，你可以重新做人。can be 的 be 是「成为」，不是「是」。"
        },
        {
          "id": "l47",
          "text": "In New York you can",
          "zh": "在纽约，你将",
          "note": "副歌被拆成短句，跟着节奏一句一句往上推。"
        },
        {
          "id": "l48",
          "text": "Be a new man—   (Just you wait!)",
          "zh": "脱胎换骨大不一样——（你们等着看！）",
          "note": "Just you wait = 你等着看，全剧的口号。括号里是群众和声。"
        },
        {
          "id": "l49",
          "text": "In New York you can",
          "zh": "在纽约，你将",
          "note": "副歌再来一次。"
        },
        {
          "id": "l50",
          "text": "Be a new man— \t (Just you wait!)",
          "zh": "脱胎换骨大不一样——（你们等着看！）",
          "note": "（重复上句，垫情绪）"
        },
        {
          "id": "l51",
          "text": "In New York you can be a new man—",
          "zh": "在纽约，你将脱胎换骨大不一样——",
          "note": "完整句第三次出现，准备收尾。"
        },
        {
          "id": "l52",
          "text": "In New York—",
          "zh": "在纽约——",
          "note": "只留地名，制造停顿。"
        },
        {
          "id": "l53",
          "text": "New York—",
          "zh": "纽约——",
          "note": "New York 单独成句，像聚光灯打在城市上。"
        },
        {
          "id": "l54",
          "text": "Just you wait!",
          "zh": "你们等着看！",
          "note": "口号收尾，也是汉密尔顿一生的姿态：等着看我。"
        }
      ]
    },
    {
      "id": "s5",
      "title": "The Name",
      "zh": "名字",
      "note": "众人合唱、五个人的自白，最后名字被喊出来。开场曲收束，也是全剧的缩影。",
      "lines": [
        {
          "id": "l55",
          "text": "Alexander Hamilton(Alexander Hamilton)",
          "zh": "亚历山大·汉密尔顿 （亚历山大·汉密尔顿）",
          "note": "括号里是群众的和声（backing vocal），主唱唱名字，合唱重复。",
          "phrases": [
            {
              "p": "wait in the wings",
              "type": "习语",
              "zh": "在幕后等待上场",
              "d": "wings 指舞台侧幕。",
              "ex": "She is waiting in the wings for her chance.",
              "exZh": "她在幕后等待机会。"
            }
          ]
        },
        {
          "id": "l56",
          "text": "We are waiting in the wings for you(Waiting in the wings for you)",
          "zh": "我们在岸上等你到来 （在岸上等你到来 ）",
          "note": "in the wings 本指舞台侧幕，引申「在幕后等待上场」。"
        },
        {
          "id": "l57",
          "text": "You could never back down",
          "zh": "你永远都停不下自己的脚步",
          "note": "back down = 退让、认输；could never = 从来没能。",
          "phrases": [
            {
              "p": "back down",
              "type": "动词短语",
              "zh": "退让，认输",
              "d": "多用于否定或争论。",
              "ex": "Neither side would back down.",
              "exZh": "双方都不肯让步。"
            }
          ]
        },
        {
          "id": "l58",
          "text": "You never learned to take your time!",
          "zh": "你永远都学不会别再把自己催促！",
          "note": "take your time = 慢慢来、别急；never learned to = 从来学不会。",
          "phrases": [
            {
              "p": "take your time",
              "type": "固定搭配",
              "zh": "慢慢来，别着急",
              "d": "安慰别人别着急。",
              "ex": "Take your time, there’s no rush.",
              "exZh": "慢慢来，不急。"
            }
          ]
        },
        {
          "id": "l59",
          "text": "Oh, Alexander Hamilton",
          "zh": "哦，亚历山大·汉密尔顿",
          "note": "直接呼唤名字，进入副歌。"
        },
        {
          "id": "l60",
          "text": "When America sings for you",
          "zh": "当美利坚为你颂唱",
          "note": "When America sings for you = 当美国为你歌唱；when 引导时间状语从句。"
        },
        {
          "id": "l61",
          "text": "Will they know what you overcame?",
          "zh": "他们可知你所经历的这些？",
          "note": "overcome 的过去式是 overcame；what you overcame 是宾语从句：你战胜了什么。"
        },
        {
          "id": "l62",
          "text": "Will they know you rewrote the game?",
          "zh": "他们可知是你重写了一切？",
          "note": "rewrite the game = 改写游戏规则；the game 指整个政治游戏。"
        },
        {
          "id": "l63",
          "text": "The world will never be the same, oh",
          "zh": "这世界将改变得轰轰烈烈，哦",
          "note": "the same 作表语：never be the same = 再也回不到从前。"
        },
        {
          "id": "l64",
          "text": "The ship is in the harbor now",
          "zh": "船已经驶进港",
          "note": "船进港了——时间线回到 1776 年的纽约。",
          "words": [
            {
              "w": "harbor",
              "ipa": "/ˈhɑːrbər/",
              "pos": "n.",
              "zh": "港口",
              "d": "in the harbor = 在港内；动词是「庇护、怀有（想法）」。"
            }
          ]
        },
        {
          "id": "l65",
          "text": "See if you can spot him",
          "zh": "看聚光灯是否已落于他身上",
          "note": "spot 作动词「认出、发现」；see if you can spot him = 看看你能不能认出他。",
          "words": [
            {
              "w": "spot",
              "ipa": "/spɑːt/",
              "pos": "v.",
              "zh": "认出，发现",
              "d": "I spotted him in the crowd. 我在人群里认出了他。"
            }
          ]
        },
        {
          "id": "l66",
          "text": "(Just you wait)",
          "zh": "（你们等着看）",
          "note": "（和声）"
        },
        {
          "id": "l67",
          "text": "Another immigrant",
          "zh": "一个移民小子",
          "note": "another immigrant 是同位语：又一个移民。"
        },
        {
          "id": "l68",
          "text": "Comin’ up from the bottom",
          "zh": "从底层攀爬而上",
          "note": "come up from the bottom = 从最底层爬上来。"
        },
        {
          "id": "l69",
          "text": "(Just you wait)",
          "zh": "（你们等着看）",
          "note": "（和声）"
        },
        {
          "id": "l70",
          "text": "His enemies destroyed his rep",
          "zh": "他被敌人搞得臭不可当",
          "note": "rep = reputation 的口语缩写；his enemies destroyed his rep = 政敌毁了他的名声。",
          "words": [
            {
              "w": "rep",
              "ipa": "/rep/",
              "pos": "n.",
              "zh": "名声（reputation 的口语）",
              "d": "a good/bad rep = 好/坏名声。"
            }
          ]
        },
        {
          "id": "l71",
          "text": "America forgot him",
          "zh": "美利坚又将他遗忘",
          "note": "America forgot him = 美国忘了他。这两句是倒叙，讲他死后的名声。"
        },
        {
          "id": "l72",
          "text": "We fought with him",
          "zh": "我们与他并肩厮杀",
          "note": "we fought with him = 我们与他并肩作战（with = 一起）。"
        },
        {
          "id": "l73",
          "text": "Me? I died for him",
          "zh": "我？我殉命正为了他",
          "note": "Me? I died for him = 我？我为他而死。五个角色轮流自报与他的关系。"
        },
        {
          "id": "l74",
          "text": "Me? I trusted him",
          "zh": "我？我信任他",
          "note": "trusted = 信任（trust 的过去式）。"
        },
        {
          "id": "l75",
          "text": "Me? I loved him",
          "zh": "我？我爱他",
          "note": "loved = 爱过。"
        },
        {
          "id": "l76",
          "text": "And me? I’m the damn fool that shot him",
          "zh": "而我？我就是那个蠢货，一枪崩了他",
          "note": "And me? I’m the damn fool that shot him = 而我？我就是那个一枪崩了他的蠢货——说话者是 Burr。"
        },
        {
          "id": "l77",
          "text": "There’s a million things I haven’t done",
          "zh": "这里还有千万未竟之事为我等待",
          "note": "There’s a million things I haven’t done 再一次出现，首尾呼应。"
        },
        {
          "id": "l78",
          "text": "But just you wait!",
          "zh": "只请你们等着看",
          "note": "But just you wait! 但你们等着看！"
        },
        {
          "id": "l79",
          "text": "What’s your name, man?",
          "zh": "你叫什么，小子 ——",
          "note": "What’s your name, man? 你叫什么名字，伙计？"
        },
        {
          "id": "l80",
          "text": "Alexander Hamilton!",
          "zh": "亚历山大·汉密尔顿！",
          "note": "回答：Alexander Hamilton！名字被完整喊出，开场曲收束。"
        }
      ]
    }
  ],
  "background": [
    {
      "id": "bio",
      "title": "他到底是谁",
      "body": "1804 年 7 月的一个清晨，汉密尔顿在新泽西的一片空地上与伯尔面对面。几小时后，他死了。这场决斗结束了他极其传奇的一生。他生于尼维斯，在圣克罗伊长大，父母双亡，十几岁到北美时几乎一无所有。到三十四岁，他已经是美国首任财政部长、联邦党领袖、《联邦党人文集》的主要作者。他主张强联邦政府和国家银行——这些主张让他与杰斐逊成了终身对手。但音乐剧没有从他的死讲起，而是从他在加勒比的出生讲起，因为那一段才能解释后面的一切。",
      "titleEn": "Who He Was",
      "bodyEn": "On a cold morning in July 1804, Alexander Hamilton stood in a clearing in New Jersey facing Aaron Burr. Hours later he was dead. The duel ended one of the most extraordinary lives in American history. Born on Nevis and raised on St. Croix without parents, Hamilton arrived in North America as a teenager with almost nothing. By thirty-four he was the first Secretary of the Treasury, a leader of the Federalist Party, and the main author of The Federalist Papers. He fought for a strong central government and a national bank—ideas that made Thomas Jefferson his lifelong opponent. Yet the musical does not begin with his death. It begins with his birth in the Caribbean, because that is the part of his story that explains everything else.",
      "glossary": [
        {
          "w": "secretary",
          "zh": "部长"
        },
        {
          "w": "Federalist",
          "zh": "联邦党人"
        },
        {
          "w": "duel",
          "zh": "决斗"
        },
        {
          "w": "central government",
          "zh": "中央政府"
        }
      ],
      "quiz": [
        {
          "q": "According to the passage, Hamilton disagreed with Thomas Jefferson mainly because ______.",
          "options": [
            "he wanted a strong central government and a national bank",
            "he believed the U.S. should stay out of foreign wars",
            "he opposed the idea of a national bank",
            "he wanted to abolish the office of the Treasury"
          ],
          "answer": 0,
          "explain": "文中说他主张强联邦政府、国家银行和工业化，这些主张让他与杰斐逊直接冲突。"
        },
        {
          "q": "What can be inferred from the last sentence of the passage?",
          "options": [
            "The musical begins with Hamilton's birth in the Caribbean.",
            "The musical avoids discussing Hamilton's early life.",
            "Hamilton was born into a wealthy family.",
            "The musical starts with his years as Treasury Secretary."
          ],
          "answer": 0,
          "explain": "最后一句说他是美国历史上最极端的“白手起家”样本，并说音乐剧正是从这里开始——即从加勒比出身讲起。"
        }
      ],
      "kind": "story",
      "sources": [
        {
          "title": "Encyclopaedia Britannica · Alexander Hamilton",
          "url": "https://www.britannica.com/biography/Alexander-Hamilton"
        }
      ]
    },
    {
      "id": "caribbean",
      "title": "加勒比：被丢掉的那段",
      "body": "1768 年，一个十一二岁的男孩在圣克罗伊岛看着母亲去世。父亲早已弃家而去。汉密尔顿成了孤儿，到一家商行当学徒，记账、跑腿。他没受过多少正规教育，却把办公室里的书读完了。1772 年，一场飓风摧毁了小岛。他给当地报纸写了一封信，描述这场灾难。信写得太有力量，当地商人凑钱送他去北美。他带着一支笔离开，再也没有回来。",
      "titleEn": "The Caribbean: Where He Was Left",
      "bodyEn": "In 1768, a boy of eleven or twelve watched his mother die on the island of St. Croix. His father had already abandoned the family. Alexander Hamilton was now an orphan, and he went to work as a clerk in a trading firm, keeping accounts and running errands. He had little formal schooling, but he read every book in the office. Then, in 1772, a hurricane destroyed the island. Hamilton wrote a letter about the disaster to a local newspaper. The letter was so vivid that local businessmen took up a collection and paid for his passage to North America. He sailed away with little more than a pen, and he never came back.",
      "glossary": [
        {
          "w": "abandon",
          "zh": "抛弃"
        },
        {
          "w": "clerk",
          "zh": "职员，店员"
        },
        {
          "w": "errand",
          "zh": "差事"
        },
        {
          "w": "hurricane",
          "zh": "飓风"
        },
        {
          "w": "passage",
          "zh": "船费；航程"
        }
      ],
      "quiz": [
        {
          "q": "Why did local businessmen pay for Hamilton's passage to North America?",
          "options": [
            "They wanted him to work for them in New York.",
            "They were impressed by a letter he wrote about a hurricane.",
            "They were old friends of his father.",
            "They wanted him to study law abroad."
          ],
          "answer": 1,
          "explain": "1772 年飓风后他给报纸写信，当地商人被打动，出钱送他去北美。"
        },
        {
          "q": "What does the author suggest by saying “He left the Caribbean with a pen”?",
          "options": [
            "A pen was his only possession.",
            "His writing was the key to his escape.",
            "He planned to become a journalist.",
            "He had forgotten to bring his books."
          ],
          "answer": 1,
          "explain": "前文说他靠写信获得资助，“with a pen” 指的是写作能力改变了他的命运。"
        }
      ],
      "kind": "story",
      "sources": [
        {
          "title": "Encyclopaedia Britannica · Alexander Hamilton",
          "url": "https://www.britannica.com/biography/Alexander-Hamilton"
        }
      ]
    },
    {
      "id": "ten-dollar",
      "title": "十美元上的那张脸",
      "body": "开场曲里有一句词同时做了两件事：“十美元上的国父，没有父亲。”表面看，它指十美元纸币上的头像；但 Founding Father 也指开国元勋，without a father 又提醒我们：汉密尔顿是私生子，从没见过父亲。一句词，把国家给他的荣耀和出身给他的羞辱并排放在一起。观众先笑，随后才觉出疼。这是一个双关，也是七个词写成的传记。",
      "titleEn": "The Face on the Ten-Dollar Bill",
      "bodyEn": "In the opening number, the company sings one line that does two things at once: “the ten-dollar Founding Father without a father.” On the surface it points to the portrait on the ten-dollar bill. But “Founding Father” also means one of the men who built the nation, and “without a father” reminds us that Hamilton was born out of wedlock and never knew his father. In a single line, Miranda sets the honor the country gave him beside the shame of his origins. The audience laughs, then feels the sting. It is a pun, but it is also a whole biography in seven words.",
      "glossary": [
        {
          "w": "out of wedlock",
          "zh": "非婚生的"
        },
        {
          "w": "Founding Father",
          "zh": "开国元勋"
        },
        {
          "w": "origins",
          "zh": "出身"
        },
        {
          "w": "pun",
          "zh": "双关语"
        }
      ],
      "quiz": [
        {
          "q": "What is the main point of the passage?",
          "options": [
            "Hamilton's face should not be on the ten-dollar bill.",
            "The line works on two levels at the same time.",
            "“Founding Father” is an outdated term.",
            "The musical avoids wordplay."
          ],
          "answer": 1,
          "explain": "全文讲的是这句歌词的双关：既指十美元上的头像，也指“国父”与“没有父亲”。"
        },
        {
          "q": "In the line, “without a father” refers to ______.",
          "options": [
            "Hamilton's father dying in the war",
            "Hamilton's illegitimate birth and absent father",
            "Washington acting as his political father",
            "the absence of a father figure in the musical"
          ],
          "answer": 1,
          "explain": "文中明确说 without a father 指向他私生子的出身和缺席的父亲。"
        }
      ],
      "kind": "story",
      "sources": [
        {
          "title": "U.S. Currency Education Program · $10 Note",
          "url": "https://www.uscurrency.gov/denominations/10"
        }
      ]
    },
    {
      "id": "question",
      "title": "为什么用问句开场",
      "body": "灯光暗下。一个人走上前，没有自我介绍，而是问了一个问题：一个私生子、孤儿、妓女的儿子、苏格兰人的后代，怎么能长成英雄和学者？句子太长，跨了四行才说完。观众等着谓语，其实也在等汉密尔顿的未来。这个问题就是整部剧的论点：是出身决定你，还是你自己决定？Miranda 本可以从传记讲起，却选择了一个问句，因为问句会让观众前倾。",
      "titleEn": "Why Open With a Question",
      "bodyEn": "The lights go down. A man steps forward and does not introduce himself. He asks a question: how does a bastard, orphan, son of a whore and a Scotsman grow up to be a hero and a scholar? The sentence is so long that it takes four lines to finish. The audience waits for the verb, and in that wait they are already waiting for Hamilton’s future. That question is the thesis of the whole musical: does birth decide who you become, or do you decide? Miranda could have begun with a biography. He chose a question instead, because a question makes the audience lean forward.",
      "glossary": [
        {
          "w": "thesis",
          "zh": "论点"
        },
        {
          "w": "lean forward",
          "zh": "身体前倾（被吸引）"
        },
        {
          "w": "audience",
          "zh": "观众"
        }
      ],
      "quiz": [
        {
          "q": "Why does the author mention that the sentence takes four lines to finish?",
          "options": [
            "To criticize Miranda's grammar.",
            "To show the audience waits for the verb, just as they wait for Hamilton's future.",
            "To explain why the song is short.",
            "To prove the lyrics are hard to sing."
          ],
          "answer": 1,
          "explain": "作者说 Miranda 让观众等谓语，就像大家等汉密尔顿的命运，这是刻意的安排。"
        },
        {
          "q": "What is the thesis of the musical according to the passage?",
          "options": [
            "Birth decides everything.",
            "Whether birth or personal choice determines who you become.",
            "Only scholars can change history.",
            "Orphans can never succeed."
          ],
          "answer": 1,
          "explain": "文中把这个问题称为整部剧的 thesis：是出身决定你，还是你自己决定。"
        }
      ],
      "kind": "craft",
      "sources": [
        {
          "title": "Hamilton · Official Site",
          "url": "https://hamiltonmusical.com/"
        }
      ]
    },
    {
      "id": "craft",
      "title": "押韵就是人物",
      "body": "听开场那四个词：bastard、orphan、son of a whore、Scotsman。每个都落在重拍上，像鼓点。这里几乎没有押韵，只有节奏。再往下几行，韵来了：farther、harder、smarter、self-starter、charter。五个词同一个 -arter 尾，一个推着一个。这不是“配乐朗诵”，押韵的密度就是人物：他爬得越高，词咬得越紧。",
      "titleEn": "Rhyme as Character",
      "bodyEn": "Listen to the first four words of the show: bastard, orphan, son of a whore, Scotsman. Each one lands on a beat, like a drum. There is almost no rhyme here—only rhythm. Then, a few lines later, the rhyme arrives: farther, harder, smarter, self-starter, charter. Five words, one ending, -arter, each one pushing the last out of the way. This is not “spoken word with music.” The density of the rhyme is the character: the harder Hamilton climbs, the tighter the words lock together.",
      "glossary": [
        {
          "w": "rhythm",
          "zh": "节奏"
        },
        {
          "w": "beat",
          "zh": "节拍"
        },
        {
          "w": "density",
          "zh": "密度"
        },
        {
          "w": "self-starter",
          "zh": "自我驱动的人"
        }
      ],
      "quiz": [
        {
          "q": "Which rhyme is mentioned in the passage?",
          "options": [
            "-arter",
            "-ight",
            "-tion",
            "-ing"
          ],
          "answer": 0,
          "explain": "文中列出 farther / harder / smarter / self-starter / charter，都是 -arter 韵。"
        },
        {
          "q": "What does the author mean by “the higher he climbs, the tighter the rhymes become”?",
          "options": [
            "Hamilton climbs a real mountain in the song.",
            "The density of rhyme reflects his ambition.",
            "The song becomes slower as it goes on.",
            "The words become harder to pronounce."
          ],
          "answer": 1,
          "explain": "作者说押韵密度编码了人物的野心：越往上爬，韵越密。"
        }
      ],
      "kind": "craft",
      "sources": [
        {
          "title": "Hamilton · Official Site",
          "url": "https://hamiltonmusical.com/"
        }
      ]
    },
    {
      "id": "listen",
      "title": "怎么听第一遍",
      "body": "第一遍别打开歌词，直接播放，让歌把你淹没。注意三件事：第一，开场第一句属于 Aaron Burr——他是叙述者，也是汉密尔顿的对手；第二，鼓点几乎不停，说唱和演唱之间几乎没有边界；第三，音乐动机后来会像老朋友一样回来。等你回来读歌词，会发现自己记住了旋律，却漏掉了一半意思。这个落差，正是这一页要补的。",
      "titleEn": "How to Listen the First Time",
      "bodyEn": "On the first listen, do not open the lyrics. Just press play and let the song wash over you. Three things are worth noticing. First, the opening line belongs to Aaron Burr, the show’s narrator and Hamilton’s rival. Second, the drums hardly ever stop; the border between rapping and singing is almost invisible. Third, musical ideas return later like old friends. When you come back to read, you will find that you remembered the melody but missed half the meaning. That gap is exactly what this page is for.",
      "glossary": [
        {
          "w": "narrator",
          "zh": "叙述者"
        },
        {
          "w": "rival",
          "zh": "对手"
        },
        {
          "w": "melody",
          "zh": "旋律"
        },
        {
          "w": "gap",
          "zh": "差距"
        }
      ],
      "quiz": [
        {
          "q": "According to the passage, who sings the opening line?",
          "options": [
            "Hamilton",
            "Aaron Burr",
            "George Washington",
            "The company"
          ],
          "answer": 1,
          "explain": "文中说开场第一句由 Aaron Burr 唱——他是叙述者，也是汉密尔顿的对手。"
        },
        {
          "q": "What is the author's advice for the first listen?",
          "options": [
            "Read the lyrics carefully first.",
            "Look up every new word.",
            "Listen without looking anything up.",
            "Watch the musical before listening."
          ],
          "answer": 2,
          "explain": "第一遍别查词，只听，注意三件事。"
        }
      ],
      "kind": "craft",
      "sources": [
        {
          "title": "Hamilton · Official Site",
          "url": "https://hamiltonmusical.com/"
        }
      ]
    }
  ],
  "timeline": [
    {
      "year": "1755/57",
      "event": "生于西印度群岛的尼维斯岛，私生子。"
    },
    {
      "year": "1768",
      "event": "母亲病逝，十一二岁成为孤儿，在圣克罗伊的商行当学徒。"
    },
    {
      "year": "1772",
      "event": "飓风后写信给报纸，被资助送往北美求学。"
    },
    {
      "year": "1773",
      "event": "入国王学院（今哥伦比亚大学）。"
    },
    {
      "year": "1776",
      "event": "独立战争爆发，后来成为华盛顿的副官。"
    },
    {
      "year": "1787",
      "event": "制宪会议，主笔《联邦党人文集》。"
    },
    {
      "year": "1789",
      "event": "出任美国第一任财政部长。"
    },
    {
      "year": "1804",
      "event": "与副总统阿伦·伯尔决斗，次日身亡。"
    }
  ],
  "characters": [
    {
      "name": "Alexander Hamilton",
      "zh": "主角。移民、孤儿、财政部长，用笔和野心往上爬。"
    },
    {
      "name": "Aaron Burr",
      "zh": "叙述者兼对手。信奉「Wait for it」，机会主义者。"
    },
    {
      "name": "George Washington",
      "zh": "他的伯乐，也是父亲形象的替代者。"
    },
    {
      "name": "Eliza Hamilton",
      "zh": "妻子。剧中的道德锚点，也是故事的保存者。"
    },
    {
      "name": "Angelica Schuyler",
      "zh": "妻姐。唯一在才智上与他平等的人。"
    },
    {
      "name": "Thomas Jefferson",
      "zh": "政治对手，从法国回来加入内阁。"
    },
    {
      "name": "James Madison",
      "zh": "制宪盟友，后来成为对手。"
    },
    {
      "name": "Marquis de Lafayette",
      "zh": "法国战友，革命中的兄弟。"
    },
    {
      "name": "John Laurens",
      "zh": "废奴主义战友，早逝。"
    },
    {
      "name": "Hercules Mulligan",
      "zh": "裁缝，也是间谍。"
    },
    {
      "name": "King George III",
      "zh": "英国国王。用三首歌反复吐槽「你们会回来求我」。"
    }
  ]
};
