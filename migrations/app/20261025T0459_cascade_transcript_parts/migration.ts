#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/241ad9d3240c24b7f4f5cd661d4cfa08ecc270e8fe50a7f07e576f2e866b66af/contract';
import startContract from '../../snapshots/241ad9d3240c24b7f4f5cd661d4cfa08ecc270e8fe50a7f07e576f2e866b66af/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b1a4637c703bbe4f2312712a8575115670738e05d31d3751eea7cee4ef244823/contract';
import endContract from '../../snapshots/b1a4637c703bbe4f2312712a8575115670738e05d31d3751eea7cee4ef244823/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'TranscriptPart',
        constraint: 'TranscriptPart_transcriptId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TranscriptPart',
        foreignKey: {
          name: 'TranscriptPart_transcriptId_fkey',
          columns: ['transcriptId'],
          references: { schema: 'public', table: 'Transcript', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
