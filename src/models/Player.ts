export class Player {
  _name: string;
  _avatar: string;
  _id: number;
  _hp: number;

  constructor(name: string, avatar: string, id: number) {
    this._name = name;
    this._avatar = avatar;
    this._id = id;
    this._hp = 120; // 初始血量
  }

  takeDamage(damage: number): void {
    this._hp = Math.max(0, this._hp - damage);
  }

  isDead(): boolean {
    return this._hp <= 0;
  }
}
