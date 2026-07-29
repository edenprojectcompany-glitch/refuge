import { describe, expect, it } from 'vitest';
import { enMinutes, etatOuverture, instantParis, semaineLisible } from '@/lib/horaires';
import type { HorairesSemaine } from '@/lib/types';

/** Un mardi, en heure d'été : Paris est à UTC+2. */
const mardi = (heureParis: string) => {
  const [h, m] = heureParis.split(':').map(Number);
  return new Date(Date.UTC(2026, 6, 14, h - 2, m));
};

const bistrot: HorairesSemaine = {
  mon: [],
  tue: [['12:00', '14:30'], ['19:00', '22:30']],
  wed: [['12:00', '14:30'], ['19:00', '22:30']],
};

const bar: HorairesSemaine = {
  mon: [['17:00', '02:00']],
  tue: [['17:00', '02:00']],
};

describe('enMinutes', () => {
  it('convertit un horaire en minutes depuis minuit', () => {
    expect(enMinutes('00:00')).toBe(0);
    expect(enMinutes('14:30')).toBe(870);
  });
});

describe('instantParis', () => {
  it('lit le jour et l heure de Paris, pas ceux du serveur', () => {
    // 23 h UTC un mardi = 1 h du matin le mercredi à Paris.
    expect(instantParis(new Date('2026-07-14T23:00:00Z'))).toEqual({ jour: 'wed', minutes: 60 });
  });

  it('gère minuit sans déborder à 24 h', () => {
    expect(instantParis(new Date('2026-07-14T22:00:00Z'))).toEqual({ jour: 'wed', minutes: 0 });
  });
});

describe('etatOuverture', () => {
  it('ne se prononce pas sans horaires', () => {
    expect(etatOuverture(null).ouvert).toBeNull();
    expect(etatOuverture({}).ouvert).toBeNull();
  });

  it('reconnaît un service en cours', () => {
    expect(etatOuverture(bistrot, mardi('13:00'))).toEqual({
      ouvert: true,
      prochainHoraire: '14:30',
      reouvrePlusTard: false,
    });
  });

  it('annonce le service suivant entre midi et le soir', () => {
    expect(etatOuverture(bistrot, mardi('16:00'))).toEqual({
      ouvert: false,
      prochainHoraire: '19:00',
      reouvrePlusTard: false,
    });
  });

  it('renvoie au lendemain après le dernier service', () => {
    expect(etatOuverture(bistrot, mardi('23:30'))).toEqual({
      ouvert: false,
      prochainHoraire: '12:00',
      reouvrePlusTard: true,
    });
  });

  it('tient compte du créneau de la veille qui franchit minuit', () => {
    // Mercredi 1 h du matin : le bar a ouvert mardi à 17 h et ferme à 2 h.
    expect(etatOuverture(bar, new Date('2026-07-14T23:00:00Z'))).toEqual({
      ouvert: true,
      prochainHoraire: '02:00',
      reouvrePlusTard: false,
    });
  });

  it('ferme bien le bar après son heure de fermeture', () => {
    // Mercredi 3 h du matin, et le mercredi n'a aucun créneau déclaré.
    expect(etatOuverture(bar, new Date('2026-07-15T01:00:00Z')).ouvert).toBe(false);
  });

  it('reste ouvert le soir même du créneau qui franchit minuit', () => {
    expect(etatOuverture(bar, mardi('23:00'))).toEqual({
      ouvert: true,
      prochainHoraire: '02:00',
      reouvrePlusTard: false,
    });
  });

  it('gère un jour explicitement fermé', () => {
    const lundi = new Date(Date.UTC(2026, 6, 13, 10, 0));
    expect(etatOuverture(bistrot, lundi)).toEqual({
      ouvert: false,
      prochainHoraire: '12:00',
      reouvrePlusTard: true,
    });
  });
});

describe('semaineLisible', () => {
  it('commence la semaine au lundi et distingue fermé d inconnu', () => {
    const semaine = semaineLisible(bistrot, 'fr');
    expect(semaine[0]).toEqual({ jour: 'mon', libelle: 'Lundi', creneaux: '' });
    expect(semaine[1].creneaux).toBe('12:00 à 14:30, 19:00 à 22:30');
    expect(semaine[6]).toEqual({ jour: 'sun', libelle: 'Dimanche', creneaux: null });
  });

  it('traduit les jours en anglais', () => {
    expect(semaineLisible(bistrot, 'en')[1].libelle).toBe('Tuesday');
  });
});
