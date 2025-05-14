// commands/misc/ask.js
import 'dotenv/config';
import { spawn } from 'child_process';
import { once }  from 'events';

export const name        = 'ask';
export const description = 'Pose une question à Mimou (parfois indisponible).';

export async function execute(message, args) {
  const userQuery = args.join(' ').trim();
  if (!userQuery) {
    return message.reply('🚫 Usage : `mimou ask [ta question]`');
  }

  const systemPrompt = process.env.ASK_SYSTEM_PROMPT || '';
  const model        = process.env.OLLAMA_MODEL       || 'gemma3:1b';
  const fullPrompt   = `${systemPrompt}\n\nUtilisateur : ${userQuery}\nIA :`;

  // 1) Envoie un message de chargement
  const loading = await message.reply('😺 Mimou réfléchit…');

  let child;
  try {
    // 2) Lance ollama en spawn et pipe le prompt, capture stderr aussi
    child = spawn('ollama', ['run', model], { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    console.error('Spawn error:', err);
    return loading.edit('❌ Erreur interne : impossible de lancer Ollama.');
  }

  // 3) Si la commande n'existe pas, on reçoit un 'error' event
  child.on('error', err => {
    console.error('Ollama spawn failed:', err);
    loading.edit('❌ Ollama non trouvé ou non démarré. Vérifie ton installation et le service Ollama.');
  });

  // 4) Pipe prompt et récupère stdout/stderr
  child.stdin.write(fullPrompt);
  child.stdin.end();

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', chunk => { stdout += chunk.toString(); });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });

  // 5) Attend la fin du process, avec timeout pour éviter blocage
  const timeoutMs = 30_000; // 30s max
  const timeout = setTimeout(() => {
    child.kill();
  }, timeoutMs);

  const [exitCode] = await Promise.race([
    once(child, 'close'),
    new Promise(res => setTimeout(() => res([null]), timeoutMs))
  ]);
  clearTimeout(timeout);

  // 6) Gère les différents cas d'erreur
  if (exitCode === null) {
    return loading.edit('❌ Le délai de réponse d’Ollama est dépassé. Essaie de relancer.');
  }
  if (exitCode !== 0) {
    console.error('Ollama stderr:', stderr);
    // Si erreur de connexion
    if (/connection refused|cannot connect|ECONN/.test(stderr.toLowerCase())) {
      return loading.edit('❌ Impossible de contacter Ollama. Vérifie que le service tourne.');
    }
    // Autre erreur
    return loading.edit(`❌ Ollama a renvoyé une erreur : ${stderr.split('\n')[0]}`);
  }

  // 7) Tronque la réponse à 4000 caractères max
  let answer = stdout.trim();
  if (!answer) {
    return loading.edit('❌ L’IA n’a renvoyé aucune réponse.');
  }
  if (answer.length > 4000) {
    answer = answer.slice(0, 4000) + '…';
  }

  // 8) Modifie le message de chargement avec la réponse
  await loading.edit(`💡 Réponse :\n${answer}`);
}
