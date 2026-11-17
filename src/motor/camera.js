// Enquadramentos e movimentos de câmera reutilizáveis (pensados para vídeo vertical 9:16).
// Roteiro: camera: medio | close | aberto | geral | baixo | alto | lado | costas | detalhe
//          mov: fixo | zoom_in | zoom_out | zoom_rapido | pan | orbita | tremor | seguir | subir | descer
//          angulo: graus em volta do alvo (0 = de frente), dist: multiplica a distância
import * as THREE from 'three';
import { suave } from './util.js';

// dist = distância, el = elevação (graus), alt = altura do ponto mirado (cabeça ~4.6, peito ~3)
export const ENQUADRAMENTOS = {
  detalhe: { dist: 3.2, el: 4, alt: 4.6 },
  close: { dist: 5.5, el: 7, alt: 4.4 },
  medio: { dist: 10, el: 9, alt: 3.4 },
  aberto: { dist: 15, el: 11, alt: 2.8 },
  geral: { dist: 26, el: 16, alt: 2.5 },
  baixo: { dist: 9, el: -12, alt: 3.6 },
  alto: { dist: 13, el: 50, alt: 2.0 },
  lado: { dist: 10, el: 7, alt: 3.4, ang: 70 },
  costas: { dist: 9, el: 12, alt: 3.8, ang: 160 },
};
export const MOVIMENTOS = ['fixo', 'zoom_in', 'zoom_out', 'zoom_rapido', 'pan', 'orbita', 'tremor', 'seguir', 'subir', 'descer'];
export const NOMES_CAMERAS = Object.keys(ENQUADRAMENTOS);

/**
 * Calcula posição e alvo da câmera no instante t.
 * alvoFn(t) -> THREE.Vector3 (base do ator/grupo focado, já com a altura do chão), espalhamento = largura do grupo.
 */
export function posicionarCamera(cam, c, t, dur, alvoFn, espalhamento = 0) {
  const e = ENQUADRAMENTOS[c.camera] || ENQUADRAMENTOS.medio;
  const k = dur > 0 ? Math.min(1, t / dur) : 0;
  let dist = e.dist * (c.dist || 1), ang = (c.angulo ?? e.ang ?? 0), el = e.el, alt = e.alt + (c.altura || 0);
  // vídeo vertical: a largura limita. Afasta até o grupo caber (com um leve corte permitido).
  if (espalhamento > 0) dist = Math.max(dist, (espalhamento + 3.2) / (cam.aspect * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * 0.85);
  const mov = c.mov || 'zoom_in';
  if (mov === 'zoom_in') dist *= 1 - 0.12 * suave(k);
  if (mov === 'zoom_out') dist *= 0.85 + 0.2 * suave(k);
  if (mov === 'zoom_rapido') dist *= 1 - 0.35 * suave(Math.min(1, t / 0.25));
  if (mov === 'pan') ang += -12 + 24 * suave(k);
  if (mov === 'orbita') ang += -30 + 60 * k;
  if (mov === 'subir') { el += 25 * suave(k); }
  if (mov === 'descer') { el += 25 * (1 - suave(k)); }
  // seguir: o alvo acompanha o ator; nos outros movimentos mira onde o ator estava no início da cena
  const alvo = alvoFn(mov === 'seguir' ? t : 0).clone().add(new THREE.Vector3(0, alt, 0));
  const a = THREE.MathUtils.degToRad(ang), b = THREE.MathUtils.degToRad(el);
  cam.position.set(alvo.x + Math.sin(a) * Math.cos(b) * dist, alvo.y + Math.sin(b) * dist, alvo.z + Math.cos(a) * Math.cos(b) * dist);
  if (mov === 'tremor') { cam.position.x += Math.sin(t * 47) * 0.08; cam.position.y += Math.sin(t * 61) * 0.08; }
  cam.lookAt(alvo);
  if (c.inclinar) cam.rotateZ(THREE.MathUtils.degToRad(c.inclinar));
  return alvo;
}
