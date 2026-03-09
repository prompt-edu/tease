import { Gender } from '../types'

export function genderEmoji(gender: Gender): string {
  switch (gender) {
    case Gender.Female:
      return '♀'
    case Gender.Male:
      return '♂'
    case Gender.Other:
      return '⚧'
    case Gender.PreferNotToSay:
      return '·'
    default:
      return '·'
  }
}
