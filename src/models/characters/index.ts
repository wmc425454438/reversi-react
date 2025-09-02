export interface Character {
  _name: string;
  _attack: number;
  _combo?: number;
  _description: string;
  _image?: string;
}

export const Liubei: Character = {
  _name: "刘备",
  _attack: 15,
  _combo: 5,
  _description: "仁德之主，攻击力中等，连击伤害稳定"
};

export const Guanyu: Character = {
  _name: "关羽",
  _attack: 20,
  _combo: 8,
  _description: "武圣关羽，攻击力最高，连击伤害惊人"
};

export const Zhangfei: Character = {
  _name: "张飞",
  _attack: 18,
  _combo: 6,
  _description: "猛将张飞，攻击力较高，连击伤害可观"
};

export const ZhaoYun: Character = {
  _name: "赵云",
  _attack: 16,
  _combo: 7,
  _description: "常山赵子龙，攻击力稳定，连击伤害优秀"
};

export const MaChao: Character = {
  _name: "马超",
  _attack: 19,
  _combo: 4,
  _description: "西凉马超，攻击力极高，连击伤害一般"
};
