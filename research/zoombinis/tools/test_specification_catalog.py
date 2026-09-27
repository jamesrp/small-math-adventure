"""Prevent evidence updates or identity mistakes from silently changing claims."""
import json
from pathlib import Path
import tempfile
import unittest
from specification_catalog import REQUIRED, build_overlay, merge_overlay, verify_snapshots


class SpecificationCatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name);self.local=self.root/'local'
        self.path=self.local/'specs/logical-journey/example.json'
        self.path.parent.mkdir(parents=True)
        note=self.root/'notes/specs/logical-journey-example.md'
        note.parent.mkdir(parents=True);note.write_text('Evidence and explicit boundaries.\n')
        self.report=self.local/'analysis/example/validation.json'
        self.report.parent.mkdir(parents=True);self.report.write_text('{"status":"passed","cases":7}\n')
        self.spec={k:{} for k in REQUIRED}
        self.spec.update(schema_version=1,game='logical-journey',id='example',name='Example',
                         difficulty_levels=[{'level':1}],completeness={'full_game_parity':False},
                         validation={'report':'local/analysis/example/validation.json'},open_questions=[])
        self.path.write_text(json.dumps(self.spec))
        self.base=[{'game':'logical-journey','id':'example','generator':{'status':'first-pass'},'name':'Example'}]

    def tearDown(self):self.temp.cleanup()

    def test_preserves_first_pass_and_detects_changed_native_report(self):
        overlay=build_overlay(self.local,self.base)
        merged=merge_overlay(self.base,overlay)
        self.assertEqual(merged[0]['generator'],self.base[0]['generator'])
        self.assertNotIn('puzzle_specification',self.base[0])
        verify_snapshots(self.local,overlay)
        self.report.write_text('{"status":"failed","cases":7}\n')
        with self.assertRaisesRegex(ValueError,'Stale specification'):
            verify_snapshots(self.local,overlay)

    def test_missing_family_prevents_complete_catalog(self):
        self.base.append({'game':'logical-journey','id':'missing'})
        with self.assertRaisesRegex(ValueError,'Missing specifications'):
            build_overlay(self.local,self.base)
        partial=build_overlay(self.local,self.base,require_complete=False)
        self.assertEqual(partial['missing'],[{'game':'logical-journey','puzzle_id':'missing'}])

    def test_duplicate_or_unknown_identity_rejected(self):
        copy=self.path.with_name('z-duplicate.json');copy.write_text(self.path.read_text())
        with self.assertRaisesRegex(ValueError,'Duplicate specification'):
            build_overlay(self.local,self.base)
        copy.unlink();self.spec['id']='unmatched';self.path.write_text(json.dumps(self.spec))
        with self.assertRaisesRegex(ValueError,'Unexpected specification'):
            build_overlay(self.local,self.base)

    def test_changed_spec_requires_reindex_even_if_report_unchanged(self):
        overlay=build_overlay(self.local,self.base)
        self.spec['open_questions']=['A new uncertainty was identified.']
        self.path.write_text(json.dumps(self.spec))
        with self.assertRaisesRegex(ValueError,'Stale specification'):
            verify_snapshots(self.local,overlay)

    def test_claimed_validation_digest_and_missing_contract_rejected(self):
        self.spec['validation']['report_sha256']='0'*64
        self.path.write_text(json.dumps(self.spec))
        with self.assertRaisesRegex(ValueError,'Stale validation report hash'):
            build_overlay(self.local,self.base)
        del self.spec['failure'];self.path.write_text(json.dumps(self.spec))
        with self.assertRaisesRegex(ValueError,'missing fields'):
            build_overlay(self.local,self.base)

    def test_embedded_reports_and_callable_model_references_are_bound(self):
        evidence=self.local/'analysis/logical-journey-example/actions.json'
        evidence.parent.mkdir(parents=True);evidence.write_text('{"passed":19}')
        model=self.root/'tools/spec_lj_example.py'
        model.parent.mkdir();model.write_text('def generate(): return 1\n')
        self.spec['generation']={'model':'tools/spec_lj_example.py:generate'}
        self.path.write_text(json.dumps(self.spec))
        overlay=build_overlay(self.local,self.base)
        refs={r['path'] for r in overlay['entries'][0]['references']}
        self.assertIn('local/analysis/logical-journey-example/actions.json',refs)
        self.assertIn('tools/spec_lj_example.py',refs)
        evidence.write_text('{"failed":1}')
        with self.assertRaisesRegex(ValueError,'Stale specification'):
            verify_snapshots(self.local,overlay)


if __name__=='__main__':unittest.main()
