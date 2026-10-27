import bank from './challenges.json';
export type Lang = 'zh' | 'en' | 'ja';
export const tr = (zh: string, en: string, ja: string) => ({zh,en,ja});
export const skills = {
 clarify: {icon:'◎',name:tr('澄清高手','Clarity scout','明確さの達人'),mission:tr('让意思更清楚','Make the meaning clear','意味を明確に'),detail:tr('把模糊的词变成具体的标准、例子或步骤。','Turn vague words into concrete criteria, examples or steps.','曖昧な言葉を基準・例・手順にする。'),prompt:tr('你说的“更好”具体指什么？请举一个例子。','What exactly do you mean by better? Give an example.','「より良い」とは具体的に？例を一つ教えて。')},
 evidence:{icon:'⌕',name:tr('证据侦探','Evidence detective','証拠探偵'),mission:tr('找到可验证的依据','Find checkable evidence','確かめられる根拠を'),detail:tr('不只看答案是否自信，还要检查来源、数据和可重复的测试。','Look beyond confidence: check sources, data and repeatable tests.','自信のある答えでも、出典・データ・再現性を確認する。'),prompt:tr('这个结论有什么证据？我可以怎样独立核实？','What evidence supports this? How can I verify it independently?','この結論の証拠は？自分でどう確認できる？')},
 assumption:{icon:'◇',name:tr('前提破译者','Assumption breaker','前提の解読者'),mission:tr('找出隐藏的前提','Expose a hidden assumption','隠れた前提を探す'),detail:tr('找出被当作理所当然的条件，检查它是否真的成立。','Find conditions taken for granted and check whether they hold.','当たり前にしている条件を見つけ、本当に成り立つか確かめる。'),prompt:tr('这个建议默认了哪些条件？如果条件不成立呢？','What conditions does this advice assume? What if they fail?','この助言は何を前提にしている？成り立たなければ？')},
 perspective:{icon:'⇄',name:tr('换位探险家','Perspective explorer','視点の冒険家'),mission:tr('看看另一个人的视角','Explore another viewpoint','別の人の視点から'),detail:tr('主动问受影响的人会怎么看，寻找不同的解释。','Ask how affected people might see it; explore other interpretations.','影響を受ける人の見方や、別の解釈を探る。'),prompt:tr('从不同意这个观点的人的角度，最有力的理由是什么？','What is the strongest reason from someone who disagrees?','反対する人の最も有力な理由は何？')},
 consequence:{icon:'↗',name:tr('未来观察员','Future scout','未来の観察者'),mission:tr('追问接下来会怎样','Follow the consequences','その後を考える'),detail:tr('顺着建议向前想一步：短期、长期和意外结果会怎样？','Follow the idea forward: consider short-term, long-term and unexpected effects.','短期・長期・予想外の影響を考える。'),prompt:tr('如果照这样做，接下来会怎样？可能有哪些意外结果？','If we do this, what follows? What unintended effects might occur?','実行すると次に何が起こる？予想外の結果は？')},
 reflect:{icon:'✦',name:tr('问题导航员','Question navigator','問いのナビゲーター'),mission:tr('重新检查问题本身','Rethink the question itself','問い自体を見直す'),detail:tr('回到真正想解决的事，检查原问题是否准确、有用，也允许自己改变想法。','Return to the real goal; check whether the question is accurate and useful, and be willing to revise your view.','本来の目的に戻り、問いの正確さや有用性を確認し、自分の考えも見直す。'),prompt:tr('我们真正想解决什么？这个问题还能怎样问？','What are we really trying to solve? How else could we ask?','本当に解決したいことは？他にどんな聞き方がある？')},
};
export type Skill = keyof typeof skills;
const distractors = [
 tr('能把这句话说得更简短吗？','Could you make that sentence shorter?','その文をもっと短くできる？'),
 tr('能把答案改成一首诗吗？','Could you turn the answer into a poem?','答えを詩にできる？'),
 tr('能再给我十个类似的建议吗？','Could you give ten more similar suggestions?','似た助言をあと十個くれる？'),
 tr('能用更肯定的语气再说一遍吗？','Could you say it again more confidently?','もっと自信を持って言い直せる？'),
 tr('能给这个方案起个酷名字吗？','Could you give this plan a cool name?','この案に格好いい名前をつける？'),
 tr('能用更多专业词解释吗？','Could you use more technical words?','もっと専門用語で説明できる？'),
];
// Seeded Fisher–Yates gives both devices the same 100-event deck without repeats.
export function deck(seed:number) {
 let x=seed>>>0; const random=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
 const items=bank.map(q=>({...q,skill:q.skill as Skill}));
 for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
 return items.map((q,i)=>{const correct=Math.floor(random()*2);const otherSkills=(Object.keys(skills) as Skill[]).filter(s=>s!==q.skill);const wrong=i<4?distractors[Math.floor(random()*distractors.length)]:skills[otherSkills[Math.floor(random()*otherSkills.length)]].prompt;return {...q,correct,options:correct===0?[q.good,wrong]:[wrong,q.good],bonus:(i+1)%5===0};});
}
export type Profile={xp:number;runs:number;pk:number;best:number;combo:number;skills:Record<string,number>;seen:number[];replays:number;invites:number};
export const emptyProfile=():Profile=>({xp:0,runs:0,pk:0,best:0,combo:0,skills:{},seen:[],replays:0,invites:0});
export const badges=[
 {icon:'⚡',name:tr('第一道闪电','First spark','最初の閃光'),hint:tr('完成一局','Finish a run','一回完走'),test:(p:Profile)=>p.runs>=1},
 {icon:'🔥',name:tr('连击起飞','On fire','コンボ点火'),hint:tr('连续答对 5 次','Get a 5 combo','5連続正解'),test:(p:Profile)=>p.combo>=5},
 {icon:'💎',name:tr('闪电十连','Perfect ten','十連の輝き'),hint:tr('连续答对 10 次','Get a 10 combo','10連続正解'),test:(p:Profile)=>p.combo>=10},
 {icon:'🤝',name:tr('亲子竞技场','Family arena','家族アリーナ'),hint:tr('完成一次双人 PK','Finish a two-player match','対戦を一回完走'),test:(p:Profile)=>p.pk>=1},
 {icon:'🚀',name:tr('再来一局！','One more run!','もう一回！'),hint:tr('主动点击再来一局','Choose to play again','もう一度を選ぶ'),test:(p:Profile)=>p.replays>=1},
 {icon:'🌈',name:tr('六面探索者','Six-way explorer','六つの探検'),hint:tr('六类技能都答对过','Score in all six skills','六つの技で正解'),test:(p:Profile)=>Object.keys(skills).every(s=>(p.skills[s]??0)>0)},
 {icon:'🏅',name:tr('挑战收藏家','Challenge collector','挑戦コレクター'),hint:tr('遇见 50 个不同事件','See 50 different events','50種類の問題に挑戦'),test:(p:Profile)=>p.seen.length>=50},
 {icon:'👑',name:tr('百题探险家','Century explorer','百問の冒険家'),hint:tr('遇见全部 100 个事件','See all 100 events','100種類すべてに挑戦'),test:(p:Profile)=>p.seen.length>=100},
 {icon:'✨',name:tr('提问新星','Rising questioner','問いの新星'),hint:tr('完成 10 局','Finish 10 runs','10回完走'),test:(p:Profile)=>p.runs>=10},
 {icon:'📨',name:tr('发起挑战','Challenger','挑戦状'),hint:tr('复制一次 PK 邀请','Copy a PK invitation','対戦招待をコピー'),test:(p:Profile)=>p.invites>=1},
];
export const ranks=[tr('好奇新手','Curious rookie','好奇心ルーキー'),tr('追问学徒','Question apprentice','問いの見習い'),tr('思维探险家','Thought explorer','思考の冒険家'),tr('提问骑士','Question knight','問いの騎士'),tr('闪电大师','Lightning master','閃光マスター')];
export const rankIndex=(xp:number)=>Math.min(4,Math.floor(xp/500));
