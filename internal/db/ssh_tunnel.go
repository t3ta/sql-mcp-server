package db

import (
	"fmt"
	"io"
	"net"
	"os"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHTunnelConfig struct {
	BastionHost    string
	BastionUser    string
	PrivateKeyPath string
	RemoteHost     string
	RemotePort     string
	LocalPort      string
}

// StartSSHTunnel establishes an SSH tunnel from localPort to remoteHost:remotePort via bastion.
func StartSSHTunnel(cfg SSHTunnelConfig) error {
	key, err := os.ReadFile(cfg.PrivateKeyPath)
	if err != nil {
		return fmt.Errorf("failed to read private key: %w", err)
	}

	var signer ssh.Signer
	passphrase := os.Getenv("SSH_KEY_PASSPHRASE")
	if passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase(key, []byte(passphrase))
		if err != nil {
			return fmt.Errorf("failed to parse encrypted private key: %w", err)
		}
	} else {
		signer, err = ssh.ParsePrivateKey(key)
		if err != nil {
			return fmt.Errorf("failed to parse private key: %w", err)
		}
	}

	sshConfig := &ssh.ClientConfig{
		User: cfg.BastionUser,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // TODO: replace with proper verification in prod
		Timeout:         10 * time.Second,
	}

	conn, err := ssh.Dial("tcp", cfg.BastionHost, sshConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to bastion host: %w", err)
	}

	listener, err := net.Listen("tcp", "127.0.0.1:"+cfg.LocalPort)
	if err != nil {
		return fmt.Errorf("failed to bind local port: %w", err)
	}

	go func() {
		for {
			localConn, err := listener.Accept()
			if err != nil {
				fmt.Println("local accept error:", err)
				continue
			}

			remoteConn, err := conn.Dial("tcp", net.JoinHostPort(cfg.RemoteHost, cfg.RemotePort))
			if err != nil {
				fmt.Println("remote dial error:", err)
				localConn.Close()
				continue
			}

			go pipe(localConn, remoteConn)
			go pipe(remoteConn, localConn)
		}
	}()

	return nil
}

func pipe(a, b net.Conn) {
	defer a.Close()
	defer b.Close()
	io.Copy(a, b)
}
