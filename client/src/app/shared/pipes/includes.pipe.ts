import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'includes',
  standalone: true,
})
export class IncludesPipe implements PipeTransform {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  transform(values: any[], value: any): boolean {
    return values.includes(value);
  }
}
