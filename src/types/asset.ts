export type AssetType =
  | 'image'
  | 'video'
  | 'gif'
  | 'audio'
  | 'pdf'
  | 'texture'
  | 'hdri'
  | 'zip_archive'
  | 'project_file'
  | 'document'
  | 'other'

export interface Asset {
  id: string
  vaultId: string
  name: string
  fileName: string
  filePath: string
  assetType: AssetType
  mimeType?: string
  fileSize: number
  width?: number
  height?: number
  durationSeconds?: number
  thumbnailPath?: string
  tags: string[]
  description?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
