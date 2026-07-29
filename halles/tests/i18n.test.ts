import { describe, expect, it } from 'vitest';
import {
  avecLangue,
  champBilingue,
  cleAvecPluriel,
  creerTraducteur,
  resoudreLocale,
} from '@/lib/i18n';

describe('resoudreLocale', () => {
  it('donne la priorité au paramètre d URL', () => {
    expect(resoudreLocale('en', 'fr')).toBe('en');
  });

  it('retombe sur la langue par défaut de l hôtel', () => {
    expect(resoudreLocale(undefined, 'en')).toBe('en');
  });

  it('ignore une valeur inconnue plutôt que de servir une page vide', () => {
    expect(resoudreLocale('de', 'fr')).toBe('fr');
  });

  it('accepte un paramètre répété en prenant le premier', () => {
    expect(resoudreLocale(['en', 'fr'], 'fr')).toBe('en');
  });
});

describe('creerTraducteur', () => {
  it('traduit une clé pointée', () => {
    expect(creerTraducteur('fr')('categories.restaurant')).toBe('Restaurants');
    expect(creerTraducteur('en')('categories.restaurant')).toBe('Restaurants');
  });

  it('interpole les variables', () => {
    expect(creerTraducteur('fr')('lieu.minutesAPied', { n: 7 })).toBe('7 min à pied');
  });

  it('renvoie la clé quand elle n existe nulle part', () => {
    expect(creerTraducteur('fr')('rien.du.tout')).toBe('rien.du.tout');
  });

  it('accorde le pluriel', () => {
    const t = creerTraducteur('fr');
    expect(t(cleAvecPluriel('accueil.bandeauSousTitre', 1), { n: 1 })).toContain('1 établissement');
    expect(t(cleAvecPluriel('accueil.bandeauSousTitre', 12), { n: 12 })).toContain(
      '12 établissements',
    );
  });
});

describe('champBilingue', () => {
  it('sert la langue demandée', () => {
    expect(champBilingue({ short_desc_fr: 'Bistrot', short_desc_en: 'Bistro' }, 'short_desc', 'en')).toBe(
      'Bistro',
    );
  });

  it('retombe sur le français quand l anglais est vide', () => {
    expect(champBilingue({ short_desc_fr: 'Bistrot', short_desc_en: '' }, 'short_desc', 'en')).toBe(
      'Bistrot',
    );
    expect(
      champBilingue({ short_desc_fr: 'Bistrot', short_desc_en: null }, 'short_desc', 'en'),
    ).toBe('Bistrot');
  });

  it('renvoie null quand rien n est renseigné', () => {
    expect(champBilingue({ short_desc_fr: null }, 'short_desc', 'fr')).toBeNull();
  });
});

describe('avecLangue', () => {
  it('n ajoute rien pour le français, langue par défaut', () => {
    expect(avecLangue('/h/lemarais/carte', 'fr')).toBe('/h/lemarais/carte');
  });

  it('ajoute le paramètre en respectant une query existante', () => {
    expect(avecLangue('/h/lemarais/carte', 'en')).toBe('/h/lemarais/carte?lang=en');
    expect(avecLangue('/h/lemarais/carte?categorie=bar', 'en')).toBe(
      '/h/lemarais/carte?categorie=bar&lang=en',
    );
  });
});
