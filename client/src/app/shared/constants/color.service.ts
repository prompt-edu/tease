import { Gender, SkillProficiency } from 'src/app/api/models';

export class ColorService {
  private static readonly NOVICE = '#e16868';
  private static readonly INTERMEDIATE = '#eed373';
  private static readonly ADVANCED = '#94da7c';
  private static readonly EXPERT = '#4e8cb9';
  private static readonly INACTIVE = '#d7dadd';

  static getSkillProficiencyColor(proficiency?: SkillProficiency): string {
    switch (proficiency) {
      case SkillProficiency.Novice:
        return this.NOVICE;
      case SkillProficiency.Intermediate:
        return this.INTERMEDIATE;
      case SkillProficiency.Advanced:
        return this.ADVANCED;
      case SkillProficiency.Expert:
        return this.EXPERT;
      default:
        return this.INACTIVE;
    }
  }

  static getSkillProficiencyColors(): string[] {
    return [this.NOVICE, this.INTERMEDIATE, this.ADVANCED, this.EXPERT];
  }

  static mapSkillProficiencyToSkillColors(skillProficiency): string[] {
    switch (skillProficiency) {
      case SkillProficiency.Novice:
        return [...Array(1).fill('novice'), ...Array(3).fill('inactive')];
      case SkillProficiency.Intermediate:
        return [...Array(2).fill('intermediate'), ...Array(2).fill('inactive')];
      case SkillProficiency.Advanced:
        return [...Array(3).fill('advanced'), ...Array(1).fill('inactive')];
      case SkillProficiency.Expert:
        return Array(4).fill('expert');
    }
    return Array(4).fill('inactive');
  }

  private static readonly MALE = '#4A90E2';
  private static readonly FEMALE = '#E24A90';
  private static readonly OTHER = '#50C878';
  private static readonly PREFER_NOT_TO_SAY = '#A0A0A0';

  static getGenderColor(gender: Gender): string {
    const genderColors = {
      [Gender.Male]: this.MALE,
      [Gender.Female]: this.FEMALE,
      [Gender.Other]: this.OTHER,
      [Gender.PreferNotToSay]: this.PREFER_NOT_TO_SAY,
    };
    return genderColors[gender] || this.PREFER_NOT_TO_SAY;
  }
}
