# Coleta dinamicamente o IP público da máquina que executa o Terraform para liberar no Firewall (NSG)
data "http" "my_ip" {
  url = "https://api.ipify.org"
}
