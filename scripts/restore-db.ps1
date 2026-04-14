param(
  [Parameter(Mandatory = $true)][string]$DumpFile,
  [Parameter(Mandatory = $true)][string]$DatabaseUrl
)

Write-Host "Restoring database from $DumpFile ..."
psql $DatabaseUrl -f $DumpFile
Write-Host "Restore complete."
