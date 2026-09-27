<?php
/** CLI-only secret setup. The API key is read from a hidden prompt, not argv. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
umask(0077);
function hidden(string $label): string {
    if (!function_exists('shell_exec')) throw new RuntimeException('Hidden input unavailable. Use the private-file setup in docs/AI_COACH.md.');
    $mode=trim((string)shell_exec('stty -g 2>/dev/null'));
    if($mode===''||!preg_match('/^[a-fA-F0-9:]+$/',$mode)) throw new RuntimeException('Run in an interactive cPanel Terminal; hidden input requires a terminal.');
    fwrite(STDOUT,$label);shell_exec('stty -echo 2>/dev/null');
    try{$text=fgets(STDIN);if($text===false)throw new RuntimeException('Input cancelled.');return trim($text);}
    finally{shell_exec('stty '.escapeshellarg($mode).' 2>/dev/null');fwrite(STDOUT,PHP_EOL);}
}
try{
    $home=getenv('HOME')?:'';
    if(function_exists('posix_getpwuid')){$p=posix_getpwuid(posix_geteuid());$home=$p['dir']??$home;}
    if($home===''||$home==='/')throw new RuntimeException('Could not identify a private home directory.');
    $file=getenv('LEARNPIANO_COACH_CONFIG')?:$home.'/.config/learnpiano/coach.php';
    if(!str_starts_with($file,'/'))throw new RuntimeException('Private configuration path must be absolute.');
    if(is_file($file)){
        fwrite(STDOUT,"Configuration already exists. Replace it? Type REPLACE: ");
        if(trim((string)fgets(STDIN))!=='REPLACE')exit("Unchanged.\n");
    }
    fwrite(STDOUT,"LearnPiano optional AI coach\nNo network request is made during setup. Your key will not be printed.\n");
    $key=hidden('OpenAI API key (hidden): ');
    if(!str_starts_with($key,'sk-')||strlen($key)<20||preg_match('/\s/',$key))throw new RuntimeException('The API key format is invalid. No file written.');
    $pass=hidden('Choose a coach login password (12+ characters; hidden): ');
    if(strlen($pass)<12)throw new RuntimeException('Choose a password with at least 12 characters.');
    if(!hash_equals($pass,hidden('Repeat coach password (hidden): ')))throw new RuntimeException('Passwords did not match.');
    $dir=dirname($file);if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Cannot create private directory.');
    $real=realpath($dir);$project=realpath(dirname(__DIR__));
    if(!$real||$real===$project||str_starts_with($real,$project.'/')||preg_match('~/(public_html|www|htdocs)(/|$)~',$real))throw new RuntimeException('Use a directory outside ALL website document roots.');
    if((fileperms($dir)&0077)!==0)throw new RuntimeException('Private directory must have permissions 0700.');
    $config=['enabled'=>true,'api_key'=>$key,'password_hash'=>password_hash($pass,PASSWORD_DEFAULT),
        'model'=>'gpt-4.1-mini-2025-04-14','voice'=>'cedar','daily_calls'=>60,'monthly_calls'=>600];
    $text="<?php\n// Private LearnPiano configuration: never commit or move into a website directory.\nreturn ".var_export($config,true).";\n";
    $tmp=$file.'.new-'.bin2hex(random_bytes(5));
    if(file_put_contents($tmp,$text,LOCK_EX)!==strlen($text))throw new RuntimeException('Could not save configuration.');
    chmod($tmp,0600);if(!rename($tmp,$file)){@unlink($tmp);throw new RuntimeException('Could not activate configuration.');}
    unset($key,$pass,$config,$text);
    fwrite(STDOUT,"Saved private configuration to ".$file."\nOpen the piano, press Ask coach, then enter your COACH PASSWORD (not the API key).\nDefaults: 60 API calls/day, 600/month, including speech/transcription. These are request caps, NOT dollar budgets.\n");
}catch(Throwable $e){fwrite(STDERR,$e->getMessage().PHP_EOL);exit(1);}
