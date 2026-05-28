/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export interface Guest {
  id: string;
  persona: string;
  voice: string;
  role: string;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: WebSource;
}

export interface GroundedResponse {
  text: string;
  sources: GroundingChunk[];
  followOnTopics?: string[];
}

export type TurnLength = 'short' | 'long';

export type IconProps = {
  className?: string;
};
