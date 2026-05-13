export interface Character {
  _name: string;
  _attack: number;
  _combo?: number;
  _description: string;
  _image?: string;
  _faction?: '魏' | '蜀' | '吴';
}

export * from './wei.ts';
export * from './shu.ts';
export * from './wu.ts';

// 分组导出便于按势力筛选
import * as Wei from './wei.ts';
import * as Shu from './shu.ts';
import * as Wu from './wu.ts';

export const WeiCharacters: Character[] = Object.values(Wei) as unknown as Character[];
export const ShuCharacters: Character[] = Object.values(Shu) as unknown as Character[];
export const WuCharacters: Character[] = Object.values(Wu) as unknown as Character[];
export const AllCharacters: Character[] = [...WeiCharacters, ...ShuCharacters, ...WuCharacters];
