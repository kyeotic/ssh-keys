data "cloudflare_zone" "kye_dev" {
  name = var.zone_name
}

resource "cloudflare_record" "ssh_keys" {
  zone_id = data.cloudflare_zone.kye_dev.id
  name    = "ssh-keys"
  type    = "CNAME"
  value   = "kye-ssh-keys.workers.dev"
  proxied = true
}
