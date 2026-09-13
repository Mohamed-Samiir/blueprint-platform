import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@blueprint-platform/ui/button';

/**
 * Where `permissionGuard` sends a user lacking the required permission. A
 * real, minimal, styled page — not a placeholder — since the RBAC preview
 * needs somewhere real to land when demoing the deny path (see
 * `RBAC_MODULE_SYNC_SUMMARY.md` for the "is this final?" note for whoever
 * writes the platform-sync task list).
 */
@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmButtonImports],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
})
export class Forbidden {}
