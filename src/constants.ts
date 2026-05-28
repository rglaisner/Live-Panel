/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface VoiceOption {
  name: string;
  label: string;
}

export const PREBUILT_VOICES: VoiceOption[] = [
  { name: 'Achernar', label: 'Achernar (Female)' },
  { name: 'Achird', label: 'Achird (Male)' },
  { name: 'Algenib', label: 'Algenib (Male)' },
  { name: 'Algieba', label: 'Algieba (Male)' },
  { name: 'Alnilam', label: 'Alnilam (Male)' },
  { name: 'Aoede', label: 'Aoede (Female)' },
  { name: 'Autonoe', label: 'Autonoe (Female)' },
  { name: 'Callirrhoe', label: 'Callirrhoe (Female)' },
  { name: 'Charon', label: 'Charon (Male)' },
  { name: 'Despina', label: 'Despina (Female)' },
  { name: 'Enceladus', label: 'Enceladus (Male)' },
  { name: 'Erinome', label: 'Erinome (Female)' },
  { name: 'Fenrir', label: 'Fenrir (Male)' },
  { name: 'Gacrux', label: 'Gacrux (Female)' },
  { name: 'Iapetus', label: 'Iapetus (Male)' },
  { name: 'Kore', label: 'Kore (Female)' },
  { name: 'Laomedeia', label: 'Laomedeia (Female)' },
  { name: 'Leda', label: 'Leda (Female)' },
  { name: 'Orus', label: 'Orus (Male)' },
  { name: 'Pulcherrima', label: 'Pulcherrima (Female)' },
  { name: 'Puck', label: 'Puck (Male)' },
  { name: 'Rasalgethi', label: 'Rasalgethi (Male)' },
  { name: 'Sadachbia', label: 'Sadachbia (Male)' },
  { name: 'Sadaltager', label: 'Sadaltager (Male)' },
  { name: 'Schedar', label: 'Schedar (Male)' },
  { name: 'Sulafat', label: 'Sulafat (Female)' },
  { name: 'Umbriel', label: 'Umbriel (Male)' },
  { name: 'Vindemiatrix', label: 'Vindemiatrix (Female)' },
  { name: 'Zephyr', label: 'Zephyr (Female)' },
  { name: 'Zubenelgenubi', label: 'Zubenelgenubi (Male)' },
];

export const CUSTOM_ENDPOINT_VOICE = 'Custom Endpoint';

export interface MusicTrack {
  name: string;
  url: string;
}

export const BACKGROUND_MUSIC_TRACKS: MusicTrack[] = [
  { name: 'None', url: '' },
  { name: 'Uplifting Corporate', url: '/music/uplifting-corporate.mp3' },
  { name: 'Cinematic Ambient', url: '/music/cinematic-ambient.mp3' },
  { name: 'Acoustic Chill', url: '/music/acoustic-chill.mp3' },
];
