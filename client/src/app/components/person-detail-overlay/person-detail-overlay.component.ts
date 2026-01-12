import { Component, OnInit } from '@angular/core';
import { OverlayComponentData } from 'src/app/overlay.service';
import { Student, Device, LanguageProficiency, Skill, StudentSkill } from 'src/app/api/models';
import { OverlayService } from 'src/app/overlay.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { GenderService } from 'src/app/shared/helpers/gender.service';
import { GravatarService } from 'src/app/shared/helpers/gravatar.service';
import { NationalityService } from 'src/app/shared/helpers/nationality.service';
import { facIpadIcon, facIphoneIcon, facMacIcon, facWatchIcon } from 'src/assets/icons/icons';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { ColorService } from 'src/app/shared/constants/color.service';

class AssignedProjectPreference {
  name: string;
  priority: number;
  assigned: boolean;
}

class SkillDescription {
  title: string;
  colors: string[];
}
@Component({
  selector: 'app-person-detail-overlay',
  templateUrl: './person-detail-overlay.component.html',
  styleUrls: ['./person-detail-overlay.component.scss'],
  standalone: false,
})
export class PersonDetailOverlayComponent implements OnInit, OverlayComponentData {
  facMacIcon = facMacIcon;
  facIphoneIcon = facIphoneIcon;
  facIpadIcon = facIpadIcon;
  facWatchIcon = facWatchIcon;

  data: { student: Student; projectId: string };
  student: Student;
  projectId: string;
  projectPreferences: AssignedProjectPreference[];
  projectPreferenceScore: string;
  germanProficiency: string;
  englishProficiency: string;
  nationalityText: string;
  nationalityEmoji: string;
  genderIcon: string;
  gravatarURL: string;
  skillColors: string[];
  name: string;
  ownsMac: boolean;
  ownsIPhone: boolean;
  ownsIPad: boolean;
  ownsWatch: boolean;
  skills: SkillDescription[];

  constructor(
    private nationalityService: NationalityService,
    private projectsService: ProjectsService,
    private skillsService: SkillsService,
    private genderService: GenderService,
    private gravatarService: GravatarService,
    private overlayService: OverlayService
  ) {}

  ngOnInit(): void {
    this.student = this.data.student;
    this.projectId = this.data.projectId;
    if (!this.student) throw Error();
    this.projectPreferences = this.getProjectPreferences();
    this.projectPreferenceScore = this.getProjectPreferenceScore();
    this.germanProficiency = this.getLanguageProficiency('de');
    this.englishProficiency = this.getLanguageProficiency('en');
    this.nationalityText = this.nationalityService.getNameFromCode(this.student.nationality);
    this.nationalityEmoji = this.nationalityService.getEmojiFromCode(this.student.nationality);
    this.genderIcon = this.genderService.getIconFromGender(this.student.gender);
    this.gravatarURL = this.gravatarService.getGravatarURLFromMail(this.student.email);
    this.skillColors = ColorService.mapSkillProficiencyToSkillColors(this.student.introCourseProficiency);
    this.ownsMac = this.student.devices.includes(Device.Mac);
    this.ownsIPhone = this.student.devices.includes(Device.IPhone);
    this.ownsIPad = this.student.devices.includes(Device.IPad);
    this.ownsWatch = this.student.devices.includes(Device.Watch);
    this.name = `${this.student.firstName} ${this.student.lastName}`;
    this.skills = this.getStudentSkills(this.skillsService.getSkills(), this.student.skills);
  }

  private getStudentSkills(skills: Skill[], studentSkills: StudentSkill[]): SkillDescription[] {
    return skills.map(skill => {
      const studentSkill = studentSkills.find(studentSkill => studentSkill.id === skill.id);
      return {
        title: skill.title,
        colors: ColorService.mapSkillProficiencyToSkillColors(studentSkill?.proficiency),
      };
    });

    return null;
  }

  private getProjectPreferenceScore(): string {
    if (this.projectId && this.projectPreferences.length) {
      const priority = this.student.projectPreferences.find(project => project.projectId === this.projectId)?.priority;
      // +1 because the priority is 0-based
      return (priority + 1).toString() || '#';
    }
    return '#';
  }

  private getProjectPreferences(): AssignedProjectPreference[] {
    return this.student.projectPreferences
      .sort((a, b) => a.priority - b.priority)
      .map(project => ({
        // +1 because the priority is 0-based
        priority: project.priority + 1,
        name: this.projectsService.getProjectNameById(project.projectId),
        assigned: this.projectId === project.projectId,
      }));
  }

  private getLanguageProficiency(isoCode: string): LanguageProficiency {
    return this.student.languages.find(language => language.language === isoCode).proficiency;
  }
}
