<?php
declare(strict_types=1);
require_once __DIR__.'/../coach-lib.php';
$n=0;
function check(bool $x,string $label):void{global $n;if(!$x)throw new RuntimeException($label);$n++;echo "PASS $label\n";}
function rejected(callable $f,int $status):bool{try{$f();return false;}catch(CoachError $e){return $e->status===$status;}}
$context=coachContext(['title'=>'Fixture','measures'=>[['label'=>'0','start'=>0,'end'=>.5],['label'=>'1','start'=>.5,'end'=>4.5]],'from'=>1,'to'=>2,'hands'=>['right'],'notes'=>[['midi'=>60,'beat'=>0,'duration'=>.5,'hand'=>'right']],'detector'=>['correct'=>2,'has_attempt'=>true]]);
check($context['editorially_verified']===false,'cannot claim a verified edition');
check(str_contains($context['detector']['reliability'],'unvalidated'),'detector confidence never promoted');
check($context['measures'][0]['label']==='0'&&$context['measures'][0]['index']===1,'pickup label differs from measure index');
$answer=['reply'=>'Try a short passage.','focus'=>'Steady pulse','action'=>['type'=>'set_tempo','from'=>0,'to'=>0,'bpm'=>60,'hand'=>'both','mode'=>'practice']];
check(coachValidateAnswer($answer,$context)['action']['bpm']===60,'valid bounded tempo proposal');
foreach (['shell','eval','fetch_url','update_github'] as $type){$a=$answer;$a['action']['type']=$type;check(coachValidateAnswer($a,$context)['action']['type']==='none','reject '.$type);}
$a=$answer;$a['action']['bpm']=900;check(coachValidateAnswer($a,$context)['action_rejected'],'reject excessive tempo');
$a=$answer;$a['action']['type']='demonstrate';$a['action']['from']=1;$a['action']['to']=2;$a['action']['hand']='left';check(coachValidateAnswer($a,$context)['action_rejected'],'do not invent missing left hand');
$a['action']['hand']='right';check(!coachValidateAnswer($a,$context)['action_rejected'],'valid right-hand demonstration');
$a['action']['to']=10;check(coachValidateAnswer($a,$context)['action_rejected'],'reject out-of-score action');
check(rejected(fn()=>coachReply(['status'=>'incomplete'],$context),502),'reject unfinished model response');
check(rejected(fn()=>coachReply(['status'=>'completed','output'=>[['content'=>[['type'=>'refusal']]]]],$context),422),'handle model refusal');
check(rejected(fn()=>coachContext(['measures'=>[['start'=>3,'end'=>2]]]),400),'reject reversed measure bounds');
check(coachWithin('/site/sub/x','/site')&&!coachWithin('/site2/x','/site'),'private-path comparison uses directory boundaries');
$dir=sys_get_temp_dir().'/lpcoach-unit-'.bin2hex(random_bytes(5));mkdir($dir,0700);
$c=['state_dir'=>$dir,'daily_calls'=>2,'monthly_calls'=>3];
check(coachLedger($c)['daily']===0,'zero calls on status');
coachLedger($c,'ask');coachLedger($c,'speak');check(coachLedger($c)['daily']===2,'voice and text share request budget');
check(rejected(fn()=>coachLedger($c,'transcribe'),429),'daily cap enforced before upstream call');
for($i=0;$i<20;$i++)coachLedger($c,null,true);
check(rejected(fn()=>coachLedger($c,null,true),429),'global login throttle');
file_put_contents($dir.'/usage.json','{"bad"');check(rejected(fn()=>coachLedger($c,'ask'),503),'damaged ledger fails closed');
unlink($dir.'/usage.json');rmdir($dir);
check(str_contains(coachPrompt(),'Do NOT claim to hear piano audio'),'prompt cannot claim it heard piano');
check(coachSchema()['additionalProperties']===false,'structured schema excludes extra keys');
echo "$n coach API unit checks passed; no OpenAI requests made.\n";
