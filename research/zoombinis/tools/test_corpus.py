"""Bounds/provenance checks for user-supplied discs and isolated RNG semantics."""
import struct
import tempfile
import unittest
from pathlib import Path
from corpus import both_endian, iso_files, safe_name
from native_analysis import logical_journey_random, mountain_rescue_random


class CorpusTests(unittest.TestCase):
    @staticmethod
    def sample_iso(filename="Data.bin", payload_sector=20):
        """Minimal independent ISO fixture with a file at a known byte range."""
        data = bytearray(21 * 2048)
        def dual32(value):
            return struct.pack("<I", value) + struct.pack(">I", value)
        def record(name, sector, size, flags=0):
            raw = name if isinstance(name, bytes) else name.encode("ascii")
            n = 33 + len(raw) + (len(raw) % 2 == 0)
            r = bytearray(n)
            r[0], r[25], r[32] = n, flags, len(raw)
            r[2:10], r[10:18] = dual32(sector), dual32(size)
            r[28:32] = b"\1\0\0\1"
            r[33:33 + len(raw)] = raw
            return r
        pvd = 16 * 2048
        data[pvd:pvd+7] = b"\1CD001\1"
        data[pvd+40:pvd+72] = b"TEST".ljust(32,b" ")
        data[pvd+128:pvd+132] = b"\0\x08\x08\0"
        data[pvd+156:pvd+190] = record(b"\0", 19, 2048, 2)
        data[17*2048:17*2048+7] = b"\xffCD001\1"
        entries = record(b"\0",19,2048,2) + record(b"\1",19,2048,2) + record(filename,payload_sector,4)
        data[19*2048:19*2048+len(entries)] = entries
        data[20*2048:20*2048+4] = b"test"
        return data

    def test_real_directory_walk_and_byte_provenance(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.iso"
            path.write_bytes(self.sample_iso())
            volume = iso_files(path)
            self.assertEqual(volume["volume_id"], "TEST")
            self.assertEqual(len(volume["files"]), 1)
            file = volume["files"][0]
            self.assertEqual(file["path"], "Data.bin")
            self.assertEqual(path.read_bytes()[file["iso_offset"]:file["iso_offset"]+file["size"]], b"test")

    def test_directory_extent_and_path_corruption(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.iso"
            for data in (self.sample_iso("../escape"), self.sample_iso(payload_sector=100)):
                path.write_bytes(data)
                with self.assertRaises(ValueError):
                    iso_files(path)

    def test_reject_unsafe_names(self):
        for value in ("..", ".", "", "../outside", "a/b", "a\\b", "x\0y"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                safe_name(value)
        self.assertEqual(safe_name("User's Guide.pdf"), "User's Guide.pdf")

    def test_mismatched_directory_field(self):
        with self.assertRaises(ValueError):
            both_endian(struct.pack("<I", 12) + struct.pack(">I", 13), 0, 4)

    def test_truncated_image(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "bad.iso"
            path.write_bytes(b"\0" * 32768)
            with self.assertRaisesRegex(ValueError, "bounds"):
                iso_files(path)

    def test_random_models_known_state_transitions(self):
        # From the disassembled multiply/add/shift, including 32-bit overflow.
        self.assertEqual(mountain_rescue_random(1), (2745024, 41))
        self.assertEqual(mountain_rescue_random(0xFFFFFFFF), (2316998, 35))
        self.assertEqual(logical_journey_random(1, 5), (2745024, 5))
        self.assertEqual(logical_journey_random(123, 0), (123, 0))
        # LJ uses all 16 high bits, unlike Mountain Rescue's 15-bit result.
        state, result = logical_journey_random(11000, 65535)
        self.assertEqual(result, state >> 16)
        self.assertGreater(result, 32767)


if __name__ == "__main__":
    unittest.main()
