import { Injectable } from '@angular/core';
import {
  Device,
  Gender,
  Language,
  LanguageProficiency,
  Project,
  ProjectPreference,
  Skill,
  SkillProficiency,
  Student,
  StudentSkill,
} from 'src/app/api/models';
import { CsvStudent } from '../models/csvStudent';
import { v4 as uuidv4 } from 'uuid';
import { EnumService } from '../utils/enum.service';
import * as Papa from 'papaparse';

export interface ImportData {
  students: Student[];
  projects: Project[];
  skills: Skill[];
}

interface Attribute {
  attribute: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class CsvParserService {
  readonly DEFAULT_LANGUAGE_PROFICIENCY = LanguageProficiency.A1A2;
  readonly DEFAULT_SKILL_PROFICIENCY = SkillProficiency.Novice;
  readonly DEFAULT_GENDER = Gender.PreferNotToSay;

  constructor(private enumService: EnumService) {}

  async getData(file: File): Promise<ImportData> {
    try {
      const csvStudents = await this.getCsvDataFromFile(file);
      return this.getImportData(csvStudents);
    } catch (error) {
      return null;
    }
  }

  async getCsvDataFromFile(file: File): Promise<CsvStudent[]> {
    return new Promise(resolve => {
      Papa.parse(file, {
        complete: results => {
          resolve(results.data);
        },
        header: true,
        download: true,
      });
    });
  }

  private findAttributes(student: CsvStudent, value: string): Attribute[] {
    const regex = new RegExp(`${value}\\[(.*)\\]`);
    const attributes = Object.keys(student);
    const matchingAttributes = attributes
      .map(attribute => {
        const match = attribute.match(regex);
        return match ? { attribute, value: match[1] } : null;
      })
      .filter(item => item !== null);
    return matchingAttributes;
  }

  private getAttributes<T>(reference: CsvStudent, key: string, create: (value: string) => T): T[] {
    const items: T[] = [];
    const attributes = this.findAttributes(reference, key);
    attributes.forEach(attribute => {
      const item = create(attribute.value);
      items.push(item);
    });
    return items;
  }

  private getImportData(csvStudents: CsvStudent[]): ImportData {
    if (!csvStudents.length) {
      return null;
    }

    const referenceStudent = csvStudents[0];
    const projects = this.getProjects(referenceStudent);
    const skills = this.getSkills(referenceStudent);
    const languageAttributes = this.findAttributes(referenceStudent, 'language');
    const deviceAttributes = this.findAttributes(referenceStudent, 'device');
    const skillAttributes = this.findAttributes(referenceStudent, 'skill');
    const projectPreferenceAttributes = this.findAttributes(referenceStudent, 'projectPreference');

    let students: Student[] = csvStudents.map(student => {
      if (!student.id) {
        return null;
      }
      return this.getStudent(
        student,
        projects,
        skills,
        languageAttributes,
        deviceAttributes,
        skillAttributes,
        projectPreferenceAttributes
      );
    });

    students = students.filter(student => student !== null);

    return { students, projects, skills };
  }

  private getStudent(
    student: CsvStudent,
    projects: Project[],
    skills: Skill[],
    languageAttributes: Attribute[],
    deviceAttributes: Attribute[],
    skillAttributes: Attribute[],
    projectPreferenceAttributes: Attribute[]
  ): Student {
    return {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      gender: this.enumService.getEnumValue(student.gender, Gender, this.DEFAULT_GENDER),
      id: student.id,
      semester: student.semester,
      studyDegree: student.studyDegree,
      studyProgram: student.studyProgram,
      introCourseProficiency: this.enumService.getEnumValue(
        student.skillLevel,
        SkillProficiency,
        this.DEFAULT_SKILL_PROFICIENCY
      ),
      nationality: student.nationality,
      devices: this.getDevices(student, deviceAttributes),
      languages: this.getLanguages(student, languageAttributes),
      skills: this.getStudentSkills(student, skillAttributes, skills),
      projectPreferences: this.getProjetPreferences(student, projectPreferenceAttributes, projects),
      tutorComments: [],
      studentComments: [],
      introSelfAssessment: null,
    };
  }

  private getProjects(reference: CsvStudent): Project[] {
    return this.getAttributes<Project>(reference, 'projectPreference', value => {
      return { id: uuidv4(), name: value };
    });
  }

  private getSkills(reference: CsvStudent): Skill[] {
    return this.getAttributes<Skill>(reference, 'skill', value => {
      return { id: uuidv4(), title: value, description: '' };
    });
  }

  private getLanguages(student: CsvStudent, languages: Attribute[]): Language[] {
    return languages.map(language => {
      const proficiency = this.enumService.getEnumValue(
        student[language.attribute],
        LanguageProficiency,
        this.DEFAULT_LANGUAGE_PROFICIENCY
      );
      return { language: language.value, proficiency: proficiency };
    });
  }

  private getDevices(student: CsvStudent, deviceAttributes: Attribute[]): Device[] {
    return deviceAttributes
      .map(deviceAttribute => {
        const device = this.enumService.getEnumValue(deviceAttribute.value, Device);
        return { attribute: deviceAttribute.attribute, value: device };
      })
      .filter(deviceAttribute => deviceAttribute.value !== null)
      .filter(device => student[device.attribute] === 'true')
      .map(deviceAttribute => {
        return this.enumService.getEnumValue(deviceAttribute.value, Device);
      });
  }

  private getStudentSkills(student: CsvStudent, skillAttributes: Attribute[], skills: Skill[]): StudentSkill[] {
    return skillAttributes.map(skillAttribute => {
      const skillValue = student[skillAttribute.attribute];
      const skill = skills.find(skill => skill.title === skillAttribute.value);
      const proficiency = this.enumService.getEnumValue(skillValue, SkillProficiency, SkillProficiency.Novice);
      return { id: skill.id, proficiency: proficiency };
    });
  }

  private getProjetPreferences(
    student: CsvStudent,
    projectPreferenceAttributes: Attribute[],
    projects: Project[]
  ): ProjectPreference[] {
    return projectPreferenceAttributes.map(projectPreferenceAttribute => {
      const project = projects.find(project => project.name === projectPreferenceAttribute.value);
      return { projectId: project.id, priority: parseInt(student[projectPreferenceAttribute.attribute]) };
    });
  }
}
